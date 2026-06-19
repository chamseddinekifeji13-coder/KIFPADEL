import {
  calculateRatingUpdate,
  leagueFromRating,
  previewTeamEloImpact,
} from "@/domain/rules/rating";

export { calculateRatingUpdate, leagueFromRating, previewTeamEloImpact };

export function previewRatingUpdate(avgWinner: number, avgLoser: number) {
  const delta = calculateRatingUpdate({
    averageWinnerRating: avgWinner,
    averageLoserRating: avgLoser,
  });

  return {
    delta,
    nextWinnerLeague: leagueFromRating(avgWinner + delta.winnerDelta),
    nextLoserLeague: leagueFromRating(avgLoser + delta.loserDelta),
  };
}
