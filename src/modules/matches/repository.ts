import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Repository for Match related database operations.
 */
export async function fetchOpenMatches() {
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
  return data.map((match: any) => ({
    ...match,
    playerCount: match.match_players?.length || 0,
    clubName: match.clubs?.name || "Club Inconnu",
  }));
}

export async function fetchOpenMatchesByClub(clubId: string) {
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

  return data.map((match: any) => ({
    ...match,
    playerCount: match.match_players?.length || 0,
    clubName: match.clubs?.name || "Club Inconnu",
  }));
}
