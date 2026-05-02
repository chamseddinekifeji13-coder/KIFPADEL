import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Player {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  league: "Bronze" | "Silver" | "Gold";
  trust_rating: number;
  trust_score: number;
  reliability_status?: string;
  created_at: string;
}

/**
 * Repository for Player/Profile related database operations.
 */
export async function fetchPlayers(query?: string): Promise<Player[]> {
  const supabase = await createSupabaseServerClient();

  let request = supabase
    .from("profiles")
    .select("*")
    .order("trust_rating", { ascending: false });

  if (query) {
    request = request.ilike("display_name", `%${query}%`);
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function fetchPlayerById(userId: string): Promise<Player> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Player;
}

export async function addTrustEvent(payload: {
  player_id: string;
  type: "Positive" | "Negative" | "System";
  delta: number;
  reason: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: event, error: eventError } = await supabase
    .from("trust_events")
    .insert(payload)
    .select()
    .single();

  if (eventError) throw new Error(eventError.message);

  // Get current score
  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("user_id", payload.player_id)
    .single();

  const newScore = (profile?.trust_score || 0) + payload.delta;

  // Update original profile score
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ trust_score: newScore })
    .eq("user_id", payload.player_id);

  if (profileError) throw new Error(profileError.message);

  return event;
}


export async function updatePlayerLeague(playerId: string, league: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({ league })
    .eq("user_id", playerId);

  if (error) throw new Error(error.message);
}

