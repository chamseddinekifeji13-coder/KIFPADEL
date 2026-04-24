import { calculateRatingUpdate, leagueFromRating } from "@/domain/rules/rating";

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
