import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface MatchPlayer {
  player_id: string;
}

export interface MatchClub {
  id: string;
  name: string;
  city: string;
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
}

/**
 * Repository for Match related database operations.
 */
export async function fetchOpenMatches(): Promise<MatchWithDetails[]> {
  const supabase = await createSupabaseServerClient();

  // We fetch matches with club information and count of players
  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      clubs (
        id,
        name,
        city,
        type
      ),
      match_players (
        player_id
      )
    `)
    .eq("status", "open")
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Transform to include player count
  return (data as unknown as Match[]).map((match: Match) => ({
    ...match,
    playerCount: match.match_players?.length || 0,
    clubName: match.clubs?.name || "Club Inconnu",
  }));
}

export async function fetchOpenMatchesByClub(clubId: string): Promise<MatchWithDetails[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      clubs (
        id,
        name,
        city,
        type
      ),
      match_players (
        player_id
      )
    `)
    .eq("club_id", clubId)
    .eq("status", "open")
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as Match[]).map((match: Match) => ({
    ...match,
    playerCount: match.match_players?.length || 0,
    clubName: match.clubs?.name || "Club Inconnu",
  }));
}
