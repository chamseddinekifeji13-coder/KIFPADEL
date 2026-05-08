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
    address,
    type
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
      return {
        ...match,
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

/**
 * Repository for Match related database operations.
 * Single source of truth: public.match_participants (not legacy match_players).
 */
export async function fetchOpenMatches(viewerGender: Gender | null = null): Promise<MatchWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = typesFilterForViewer(viewerGender);

    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("status", "open")
      .in("match_gender_type", allowed)
      .order("starts_at", { ascending: true });

    if (error) {
      console.warn("[matches.fetchOpenMatches] supabase error", error.message);
      return [];
    }

    return normalizeMatches(data);
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[matches.fetchOpenMatches] unexpected error", err);
    return [];
  }
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
      .in("match_gender_type", allowed)
      .order("starts_at", { ascending: true });

    if (error) {
      console.warn("[matches.fetchOpenMatchesByClub] supabase error", error.message);
      return [];
    }

    return normalizeMatches(data);
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
