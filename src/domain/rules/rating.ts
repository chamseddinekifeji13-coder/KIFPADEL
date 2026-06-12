import {
  categoryFromRating,
  sportCategoryProgress,
  type PlayerCategoryId,
} from "@/domain/rules/player-category";

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

/** Catégorie P dérivée du rating sport (ELO). */
export function leagueFromRating(rating: number): PlayerCategoryId {
  return categoryFromRating(rating);
}

export type SportLeagueProgress = import("@/domain/rules/player-category").SportCategoryProgress;

export function sportLeagueProgress(sportRating: number): SportLeagueProgress {
  return sportCategoryProgress(sportRating);
}
