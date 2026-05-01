import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export interface Player {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  league: "Bronze" | "Silver" | "Gold" | "Platinum";
  trust_rating: number;
  reliability: string;
}

export type TopRival = {
  userId: string;
  name: string;
  wins: number;
  losses: number;
  encounters: number;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  league: string | null;
  trust_rating: number | null;
  trust_score: number | null;
  reliability: string | null;
  reliability_status: string | null;
};

function normalizeLeague(value: string | null): Player["league"] {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "silver") return "Silver";
  if (normalized === "gold") return "Gold";
  if (normalized === "platinum") return "Platinum";
  return "Bronze";
}

function normalizePlayer(row: ProfileRow): Player {
  const trustBase = row.trust_rating ?? row.trust_score ?? 0;

  return {
    user_id: row.user_id,
    display_name: row.display_name ?? "Player",
    avatar_url: row.avatar_url ?? null,
    league: normalizeLeague(row.league),
    trust_rating: Number(trustBase),
    reliability: row.reliability ?? row.reliability_status ?? "healthy",
  };
}

/**
 * Repository for Player/Profile related database operations.
 */
export async function fetchPlayers(query?: string): Promise<Player[]> {
  try {
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
      console.warn("[players.fetchPlayers] supabase error", error.message);
      return [];
    }

    return ((data ?? []) as ProfileRow[]).map(normalizePlayer);
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[players.fetchPlayers] unexpected error", err);
    return [];
  }
}

export async function fetchPlayerById(userId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.warn("[players.fetchPlayerById] supabase error", error.message);
      return null;
    }

    return data;
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[players.fetchPlayerById] unexpected error", err);
    return null;
  }
}

export async function fetchTopRivals(userId: string, limit = 3): Promise<TopRival[]> {
  const supabase = await createSupabaseServerClient();

  const { data: myParticipations, error: myMatchesError } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("player_id", userId);

  if (myMatchesError || !myParticipations || myParticipations.length === 0) {
    return [];
  }

  const myMatchIds = [...new Set(myParticipations.map((entry) => entry.match_id))];

  const { data: allParticipants, error: participantsError } = await supabase
    .from("match_participants")
    .select("match_id, player_id")
    .in("match_id", myMatchIds);

  if (participantsError || !allParticipants) {
    return [];
  }

  const rivalCounts = new Map<string, number>();
  allParticipants.forEach((row) => {
    if (row.player_id !== userId) {
      rivalCounts.set(row.player_id, (rivalCounts.get(row.player_id) ?? 0) + 1);
    }
  });

  const rivalIds = [...rivalCounts.keys()];
  if (rivalIds.length === 0) {
    return [];
  }

  const { data: rivalProfiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", rivalIds);

  const nameById = new Map<string, string>();
  (rivalProfiles ?? []).forEach((profile) => {
    nameById.set(profile.user_id, profile.display_name ?? "Player");
  });

  const rivals = rivalIds
    .map((id) => {
      const encounters = rivalCounts.get(id) ?? 0;
      return {
        userId: id,
        name: nameById.get(id) ?? "Player",
        wins: 0,
        losses: 0,
        encounters,
      };
    })
    .sort((a, b) => b.encounters - a.encounters)
    .slice(0, limit);

  return rivals;
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

