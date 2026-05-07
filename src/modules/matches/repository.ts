import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export interface MatchPlayer {
  player_id: string;
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
  starts_at: string;
  ends_at: string;
  status: string;
  price_per_player: number;
  court_id: string;
  match_players: MatchPlayer[];
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
  match_players (
    player_id
  )
`;

function normalizeMatches(raw: unknown): MatchWithDetails[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Match[])
    .filter((m): m is Match => Boolean(m && typeof m === "object" && m.id))
    .map((match) => {
      const addr = match.clubs?.address?.trim();
      return {
      ...match,
      playerCount: Array.isArray(match.match_players) ? match.match_players.length : 0,
      clubName: match.clubs?.name ?? "Club Inconnu",
      clubAddress: addr && addr.length > 0 ? addr : null,
    };
    });
}

/**
 * Repository for Match related database operations.
 */
export async function fetchOpenMatches(): Promise<MatchWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("status", "open")
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

export async function fetchOpenMatchesByClub(clubId: string): Promise<MatchWithDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("club_id", clubId)
      .eq("status", "open")
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
