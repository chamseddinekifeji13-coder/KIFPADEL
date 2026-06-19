import type { SetScore } from "@/domain/rules/match-score";
import { americanoPointsFromSetScores } from "@/domain/rules/tournament-americano";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Après validation d'un score, cumule les points Américano pour les 4 joueurs du match.
 */
export async function applyAmericanoPointsForMatch(
  matchId: string,
  setScores: SetScore[],
): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: tm } = await admin
    .from("tournament_matches")
    .select("tournament_id")
    .eq("match_id", matchId)
    .maybeSingle();

  if (!tm?.tournament_id) {
    return;
  }

  const { data: tournament } = await admin
    .from("tournaments")
    .select("format")
    .eq("id", tm.tournament_id)
    .maybeSingle();

  if ((tournament as { format?: string } | null)?.format !== "americano") {
    return;
  }

  const { data: participants } = await admin
    .from("match_participants")
    .select("player_id, team")
    .eq("match_id", matchId);

  if (!participants || participants.length !== 4) {
    return;
  }

  const teamA = participants
    .filter((p) => (p as { team: string }).team === "A")
    .map((p) => String((p as { player_id: string }).player_id));
  const teamB = participants
    .filter((p) => (p as { team: string }).team === "B")
    .map((p) => String((p as { player_id: string }).player_id));

  if (teamA.length !== 2 || teamB.length !== 2) {
    return;
  }

  const playerIds: [string, string, string, string] = [
    teamA[0]!,
    teamA[1]!,
    teamB[0]!,
    teamB[1]!,
  ];

  const pointsByPlayer = americanoPointsFromSetScores(playerIds, setScores);

  for (const [playerId, delta] of Object.entries(pointsByPlayer)) {
    const { data: row } = await admin
      .from("tournament_solo_entries")
      .select("americano_points")
      .eq("tournament_id", tm.tournament_id)
      .eq("player_id", playerId)
      .maybeSingle();

    if (!row) {
      continue;
    }

    const current = Number((row as { americano_points?: number }).americano_points ?? 0);
    await admin
      .from("tournament_solo_entries")
      .update({ americano_points: current + delta })
      .eq("tournament_id", tm.tournament_id)
      .eq("player_id", playerId);
  }
}
