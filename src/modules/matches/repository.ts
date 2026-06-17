import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  matchGenderTypesVisibleToViewer,
} from "@/domain/rules/match-gender";
import type { Gender, MatchGenderType } from "@/domain/types/core";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export interface MatchParticipantRow {
  player_id: string;
  team: string;
}

export interface MatchClub {
  id: string;
  name: string;
  city: string;
  /** Adresse précise pour itinéraires si renseignée */
  address?: string | null;
  type: string;
}

export interface Match {
  id: string;
  club_id: string;
  created_by?: string | null;
  starts_at: string;
  ends_at?: string;
  status: string;
  price_per_player: number;
  court_id?: string;
  match_gender_type: MatchGenderType;
  match_participants: MatchParticipantRow[];
  clubs: MatchClub;
}

export interface MatchWithDetails extends Match {
  playerCount: number;
  clubName: string;
  clubAddress: string | null;
}

const MATCH_SELECT = `
  *,
  clubs (
    id,
    name,
    city,
    address
  ),
  match_participants (
    player_id,
    team
  )
`;

function coerceMatchGenderType(value: string | null | undefined): MatchGenderType {
  if (value === "men_only" || value === "women_only" || value === "mixed" || value === "all") {
    return value;
  }
  return "all";
}

function normalizeMatches(raw: unknown): MatchWithDetails[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Match[])
    .filter((m): m is Match => Boolean(m && typeof m === "object" && m.id))
    .map((match) => {
      const addr = match.clubs?.address?.trim();
      const parts = Array.isArray(match.match_participants) ? match.match_participants : [];
      const clubs = match.clubs
        ? { ...match.clubs, type: match.clubs.type ?? "Outdoor" }
        : match.clubs;

      return {
        ...match,
        clubs,
        match_gender_type: coerceMatchGenderType(match.match_gender_type),
        price_per_player: Number(match.price_per_player ?? 0),
        playerCount: parts.length,
        clubName: match.clubs?.name ?? "Club Inconnu",
        clubAddress: addr && addr.length > 0 ? addr : null,
      };
    });
}

function typesFilterForViewer(viewerGender: Gender | null) {
  return matchGenderTypesVisibleToViewer(viewerGender);
}

/** Matchs ouverts encore « à l’affiche » (créneau pas trop ancien). */
const OPEN_MATCH_LISTING_GRACE_MS = 90 * 60 * 1000;

function openMatchListingFloorIso(): string {
  return new Date(Date.now() - OPEN_MATCH_LISTING_GRACE_MS).toISOString();
}

export function sortMatchesByStartsAt(matches: MatchWithDetails[]): MatchWithDetails[] {
  return [...matches].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

function filterListableOpenMatches(matches: MatchWithDetails[]): MatchWithDetails[] {
  const floor = Date.now() - OPEN_MATCH_LISTING_GRACE_MS;
  return matches.filter((m) => new Date(m.starts_at).getTime() >= floor);
}

/**
 * Repository for Match related database operations.
 * Single source of truth: public.match_participants (not legacy match_players).
 */
function mergeMatchesById(lists: MatchWithDetails[][]): MatchWithDetails[] {
  const byId = new Map<string, MatchWithDetails>();
  for (const list of lists) {
    for (const m of list) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

export async function fetchOpenMatches(viewerGender: Gender | null = null): Promise<MatchWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = typesFilterForViewer(viewerGender);

    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("status", "open")
      .gte("starts_at", openMatchListingFloorIso())
      .in("match_gender_type", allowed)
      .order("starts_at", { ascending: true });

    if (error) {
      console.warn("[matches.fetchOpenMatches] supabase error", error.message);
      return [];
    }

    return filterListableOpenMatches(normalizeMatches(data));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[matches.fetchOpenMatches] unexpected error", err);
    return [];
  }
}

/** Matchs ouverts créés par le joueur ou où il est inscrit (toujours visibles pour lui). */
export async function fetchUserOpenMatches(userId: string): Promise<MatchWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: createdRows, error: createdError } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("status", "open")
      .eq("created_by", userId)
      .gte("starts_at", openMatchListingFloorIso());

    if (createdError) {
      console.warn("[matches.fetchUserOpenMatches] created error", createdError.message);
    }

    const { data: participations, error: partError } = await supabase
      .from("match_participants")
      .select("match_id")
      .eq("player_id", userId);

    if (partError) {
      console.warn("[matches.fetchUserOpenMatches] participations error", partError.message);
    }

    const participantIds = [...new Set((participations ?? []).map((p) => p.match_id as string))];

    let participantRows: unknown[] = [];
    if (participantIds.length > 0) {
      const { data, error } = await supabase
        .from("matches")
        .select(MATCH_SELECT)
        .eq("status", "open")
        .gte("starts_at", openMatchListingFloorIso())
        .in("id", participantIds);

      if (error) {
        console.warn("[matches.fetchUserOpenMatches] participant matches error", error.message);
      } else {
        participantRows = data ?? [];
      }
    }

    return filterListableOpenMatches(
      mergeMatchesById([normalizeMatches(createdRows ?? []), normalizeMatches(participantRows)]),
    );
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[matches.fetchUserOpenMatches] unexpected error", err);
    return [];
  }
}

/**
 * Liste publique (filtre genre) + matchs du joueur connecté (créateur ou participant).
 */
export async function fetchOpenMatchesForViewer(
  viewerGender: Gender | null,
  viewerId: string | null,
): Promise<MatchWithDetails[]> {
  const publicMatches = await fetchOpenMatches(viewerGender);
  if (!viewerId) return publicMatches;

  const ownMatches = await fetchUserOpenMatches(viewerId);
  return mergeMatchesById([publicMatches, ownMatches]);
}

export async function fetchOpenMatchesByClub(
  clubId: string,
  viewerGender: Gender | null = null,
): Promise<MatchWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = typesFilterForViewer(viewerGender);

    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("club_id", clubId)
      .eq("status", "open")
      .gte("starts_at", openMatchListingFloorIso())
      .in("match_gender_type", allowed)
      .order("starts_at", { ascending: true });

    if (error) {
      console.warn("[matches.fetchOpenMatchesByClub] supabase error", error.message);
      return [];
    }

    return filterListableOpenMatches(normalizeMatches(data));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[matches.fetchOpenMatchesByClub] unexpected error", err);
    return [];
  }
}

export async function fetchMatchById(matchId: string): Promise<MatchWithDetails | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("id", matchId)
      .maybeSingle();

    if (error || !data) {
      if (error?.message) console.warn("[matches.fetchMatchById] supabase error", error.message);
      return null;
    }

    const list = normalizeMatches([data as Match]);
    return list[0] ?? null;
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[matches.fetchMatchById] unexpected error", err);
    return null;
  }
}
