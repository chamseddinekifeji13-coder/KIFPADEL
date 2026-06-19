import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { isActiveMatchParticipantRow } from "@/domain/rules/match-participant";

export type PlayerRatingEvent = {
  id: string;
  matchId: string | null;
  oldRating: number;
  newRating: number;
  ratingChange: number;
  createdAt: string;
};

export type PlayerMatchStats = {
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestWinStreak: number;
};

export type MatchTeamRatings = {
  teamA: number;
  teamB: number;
};

export async function fetchPlayerRatingEvents(
  playerId: string,
  limit = 12,
): Promise<PlayerRatingEvent[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("player_rating_events")
      .select("id, match_id, old_rating, new_rating, rating_change, created_at")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[rating.fetchPlayerRatingEvents]", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      matchId: (row as { match_id?: string | null }).match_id ?? null,
      oldRating: Number((row as { old_rating: number }).old_rating),
      newRating: Number((row as { new_rating: number }).new_rating),
      ratingChange: Number((row as { rating_change: number }).rating_change),
      createdAt: String((row as { created_at: string }).created_at),
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[rating.fetchPlayerRatingEvents] unexpected", err);
    return [];
  }
}

export async function fetchPlayerMatchStats(playerId: string): Promise<PlayerMatchStats | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("player_stats")
      .select(
        "matches_played, wins, losses, win_rate, current_streak, best_win_streak",
      )
      .eq("player_id", playerId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      matchesPlayed: Number((data as { matches_played: number }).matches_played ?? 0),
      wins: Number((data as { wins: number }).wins ?? 0),
      losses: Number((data as { losses: number }).losses ?? 0),
      winRate: Number((data as { win_rate: number }).win_rate ?? 0),
      currentStreak: Number((data as { current_streak: number }).current_streak ?? 0),
      bestWinStreak: Number((data as { best_win_streak: number }).best_win_streak ?? 0),
    };
  } catch (err) {
    rethrowFrameworkError(err);
    return null;
  }
}

function averageRating(values: number[]): number {
  if (values.length === 0) {
    return 1200;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Moyennes Elo des équipes A/B pour un match (participants actifs). */
export async function fetchMatchTeamRatings(matchId: string): Promise<MatchTeamRatings | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: participants, error: partError } = await supabase
      .from("match_participants")
      .select("player_id, team, status")
      .eq("match_id", matchId);

    if (partError || !participants?.length) {
      return null;
    }

    const active = participants.filter((row) =>
      isActiveMatchParticipantRow({
        player_id: String((row as { player_id: string }).player_id),
        team: String((row as { team: string }).team),
        status: (row as { status?: string | null }).status,
      }),
    );

    const teamAIds = active
      .filter((row) => (row as { team: string }).team === "A")
      .map((row) => String((row as { player_id: string }).player_id));
    const teamBIds = active
      .filter((row) => (row as { team: string }).team === "B")
      .map((row) => String((row as { player_id: string }).player_id));

    const allIds = [...new Set([...teamAIds, ...teamBIds])];
    if (allIds.length === 0) {
      return { teamA: 1200, teamB: 1200 };
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, sport_rating")
      .in("id", allIds);

    if (profileError) {
      console.warn("[rating.fetchMatchTeamRatings] profiles", profileError.message);
      return null;
    }

    const ratingById = new Map<string, number>();
    for (const profile of profiles ?? []) {
      ratingById.set(
        String((profile as { id: string }).id),
        Number((profile as { sport_rating?: number | null }).sport_rating ?? 1200),
      );
    }

    return {
      teamA: averageRating(teamAIds.map((id) => ratingById.get(id) ?? 1200)),
      teamB: averageRating(teamBIds.map((id) => ratingById.get(id) ?? 1200)),
    };
  } catch (err) {
    rethrowFrameworkError(err);
    return null;
  }
}
