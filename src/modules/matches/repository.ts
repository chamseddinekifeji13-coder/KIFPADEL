import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_COURT_PLAYER_PRICE_DT } from "@/domain/rules/court-pricing";
import {
  countActiveMatchParticipants,
  isActiveMatchParticipantRow,
  resolveViewerParticipationPhase,
} from "@/domain/rules/match-participant";
import {
  matchGenderTypesVisibleToViewer,
} from "@/domain/rules/match-gender";
import type { Gender, MatchGenderType } from "@/domain/types/core";
import { parseSetScoresJson } from "@/domain/rules/match-score";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MatchParticipantRow {
  player_id: string;
  team: string;
  status?: string | null;
  share_price?: number | string | null;
  payment_method?: string | null;
  payment_committed_at?: string | null;
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

type MatchRow = {
  id: string;
  club_id: string;
  created_by?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status: string;
  price_per_player?: number | string | null;
  court_id?: string | null;
  match_gender_type?: string | null;
};

const MATCH_ROW_SELECT =
  "id, club_id, created_by, starts_at, ends_at, status, price_per_player, court_id, match_gender_type";

function coerceMatchGenderType(value: string | null | undefined): MatchGenderType {
  if (value === "men_only" || value === "women_only" || value === "mixed" || value === "all") {
    return value;
  }
  return "all";
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

function resolveMatchListPricePerPlayer(
  rawMatchPrice: number | string | null | undefined,
  participants: MatchParticipantRow[],
): number {
  const matchPrice = Number(rawMatchPrice);
  if (Number.isFinite(matchPrice) && matchPrice > 0) {
    return matchPrice;
  }

  const participantPrice = participants
    .map((p) => Number(p.share_price))
    .find((n) => Number.isFinite(n) && n > 0);
  if (participantPrice !== undefined) {
    return participantPrice;
  }

  return DEFAULT_COURT_PLAYER_PRICE_DT;
}

async function hydrateMatchRows(
  supabase: SupabaseClient,
  rows: MatchRow[],
): Promise<MatchWithDetails[]> {
  if (rows.length === 0) return [];

  const clubIds = [...new Set(rows.map((row) => row.club_id).filter(Boolean))];
  const matchIds = rows.map((row) => row.id);

  const clubById = new Map<string, MatchClub>();
  if (clubIds.length > 0) {
    const { data: clubRows, error } = await supabase
      .from("clubs")
      .select("id, name, city, address")
      .in("id", clubIds);

    if (error) {
      console.warn("[matches.hydrateMatchRows] clubs error", error.message);
    }

    for (const club of clubRows ?? []) {
      clubById.set(club.id, {
        id: club.id,
        name: club.name,
        city: club.city ?? "Tunis",
        address: club.address ?? null,
        type: "Outdoor",
      });
    }

    const missingClubIds = clubIds.filter((id) => !clubById.has(id));
    if (missingClubIds.length > 0) {
      const admin = createSupabaseAdminClient();
      const { data: adminClubRows, error: adminError } = await admin
        .from("clubs")
        .select("id, name, city, address")
        .in("id", missingClubIds);

      if (adminError) {
        console.warn("[matches.hydrateMatchRows] clubs admin fallback error", adminError.message);
      }

      for (const club of adminClubRows ?? []) {
        clubById.set(club.id, {
          id: club.id,
          name: club.name,
          city: club.city ?? "Tunis",
          address: club.address ?? null,
          type: "Outdoor",
        });
      }
    }
  }

  const participantsByMatch = new Map<string, MatchParticipantRow[]>();
  if (matchIds.length > 0) {
    const { data: partRows, error } = await supabase
      .from("match_participants")
      .select(
        "match_id, player_id, team, status, share_price, payment_method, payment_committed_at",
      )
      .in("match_id", matchIds);

    if (error) {
      console.warn("[matches.hydrateMatchRows] participants error", error.message);
    }

    for (const row of partRows ?? []) {
      const list = participantsByMatch.get(row.match_id) ?? [];
      list.push({
        player_id: row.player_id,
        team: row.team,
        status: row.status,
        share_price: row.share_price,
        payment_method: row.payment_method,
        payment_committed_at: row.payment_committed_at,
      });
      participantsByMatch.set(row.match_id, list);
    }
  }

  return rows.map((row) => {
    const clubs = clubById.get(row.club_id) ?? {
      id: row.club_id,
      name: "Club Inconnu",
      city: "Tunis",
      address: null,
      type: "Outdoor",
    };
    const parts = participantsByMatch.get(row.id) ?? [];
    const addr = clubs.address?.trim();

    return {
      id: row.id,
      club_id: row.club_id,
      created_by: row.created_by,
      starts_at: row.starts_at,
      ends_at: row.ends_at ?? undefined,
      status: row.status,
      price_per_player: resolveMatchListPricePerPlayer(row.price_per_player, parts),
      court_id: row.court_id ?? undefined,
      match_gender_type: coerceMatchGenderType(row.match_gender_type),
      match_participants: parts,
      clubs,
      playerCount: countActiveMatchParticipants(parts),
      clubName: clubs.name,
      clubAddress: addr && addr.length > 0 ? addr : null,
    };
  });
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
      .select(MATCH_ROW_SELECT)
      .eq("status", "open")
      .gte("starts_at", openMatchListingFloorIso())
      .in("match_gender_type", allowed)
      .order("starts_at", { ascending: true });

    if (error) {
      console.warn("[matches.fetchOpenMatches] supabase error", error.message);
      return [];
    }

    const hydrated = await hydrateMatchRows(supabase, (data ?? []) as MatchRow[]);
    return filterListableOpenMatches(hydrated);
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
      .select(MATCH_ROW_SELECT)
      .eq("status", "open")
      .eq("created_by", userId)
      .gte("starts_at", openMatchListingFloorIso());

    if (createdError) {
      console.warn("[matches.fetchUserOpenMatches] created error", createdError.message);
    }

    const { data: participations, error: partError } = await supabase
      .from("match_participants")
      .select("match_id, status, payment_method")
      .eq("player_id", userId);

    if (partError) {
      console.warn("[matches.fetchUserOpenMatches] participations error", partError.message);
    }

    const participantIds = [
      ...new Set(
        (participations ?? [])
          .filter((p) =>
            isActiveMatchParticipantRow({
              player_id: userId,
              team: "",
              status: p.status as string,
              payment_method: (p as { payment_method?: string }).payment_method,
            }),
          )
          .map((p) => p.match_id as string),
      ),
    ];

    let participantRows: MatchRow[] = [];
    if (participantIds.length > 0) {
      const { data, error } = await supabase
        .from("matches")
        .select(MATCH_ROW_SELECT)
        .eq("status", "open")
        .gte("starts_at", openMatchListingFloorIso())
        .in("id", participantIds);

      if (error) {
        console.warn("[matches.fetchUserOpenMatches] participant matches error", error.message);
      } else {
        participantRows = (data ?? []) as MatchRow[];
      }
    }

    const createdHydrated = await hydrateMatchRows(supabase, (createdRows ?? []) as MatchRow[]);
    const participantHydrated = await hydrateMatchRows(supabase, participantRows);

    return filterListableOpenMatches(mergeMatchesById([createdHydrated, participantHydrated]));
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
      .select(MATCH_ROW_SELECT)
      .eq("club_id", clubId)
      .eq("status", "open")
      .gte("starts_at", openMatchListingFloorIso())
      .in("match_gender_type", allowed)
      .order("starts_at", { ascending: true });

    if (error) {
      console.warn("[matches.fetchOpenMatchesByClub] supabase error", error.message);
      return [];
    }

    const hydrated = await hydrateMatchRows(supabase, (data ?? []) as MatchRow[]);
    return filterListableOpenMatches(hydrated);
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
      .select(MATCH_ROW_SELECT)
      .eq("id", matchId)
      .maybeSingle();

    if (error || !data) {
      if (error?.message) console.warn("[matches.fetchMatchById] supabase error", error.message);
      return null;
    }

    const list = await hydrateMatchRows(supabase, [data as MatchRow]);
    return list[0] ?? null;
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[matches.fetchMatchById] unexpected error", err);
    return null;
  }
}

export type MatchResultRecord = {
  matchId: string;
  winnerTeam: "A" | "B";
  setScores: { a: number; b: number }[] | null;
};

export async function fetchMatchResult(matchId: string): Promise<MatchResultRecord | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("match_results")
      .select("match_id, winner_team, set_scores")
      .eq("match_id", matchId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const winner = (data as { winner_team?: string }).winner_team;
    if (winner !== "A" && winner !== "B") {
      return null;
    }

    return {
      matchId: String((data as { match_id: string }).match_id),
      winnerTeam: winner,
      setScores: parseSetScoresJson((data as { set_scores?: unknown }).set_scores),
    };
  } catch (err) {
    rethrowFrameworkError(err);
    return null;
  }
}
