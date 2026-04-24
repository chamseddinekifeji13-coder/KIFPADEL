import { type League } from "@/domain/types/core";

export type MatchValidationInput = {
  averageWinnerRating: number;
  averageLoserRating: number;
  kFactor?: number;
};

export type RatingUpdateResult = {
  winnerDelta: number;
  loserDelta: number;
};

function expectedScore(currentRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - currentRating) / 400));
}

export function calculateRatingUpdate(input: MatchValidationInput): RatingUpdateResult {
  const kFactor = input.kFactor ?? 24;
  const winnerExpected = expectedScore(
    input.averageWinnerRating,
    input.averageLoserRating,
  );
  const loserExpected = expectedScore(
    input.averageLoserRating,
    input.averageWinnerRating,
  );

  return {
    winnerDelta: Math.round(kFactor * (1 - winnerExpected)),
    loserDelta: Math.round(kFactor * (0 - loserExpected)),
  };
}

export function leagueFromRating(rating: number): League {
  if (rating < 1150) return "bronze";
  if (rating < 1400) return "silver";
  if (rating < 1700) return "gold";
  return "platinum";
}
