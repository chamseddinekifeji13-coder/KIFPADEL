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

/** Aligné sur `process_match_result()` en base (k_factor := 32). */
export const DEFAULT_ELO_K_FACTOR = 32;

function expectedScore(currentRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - currentRating) / 400));
}

export function calculateRatingUpdate(input: MatchValidationInput): RatingUpdateResult {
  const kFactor = input.kFactor ?? DEFAULT_ELO_K_FACTOR;
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

/** Impact Elo par équipe après validation du score (même logique que le trigger SQL). */
export function previewTeamEloImpact(
  teamAAvgRating: number,
  teamBAvgRating: number,
  winnerTeam: "A" | "B",
): { teamADelta: number; teamBDelta: number } {
  const update = calculateRatingUpdate({
    averageWinnerRating: winnerTeam === "A" ? teamAAvgRating : teamBAvgRating,
    averageLoserRating: winnerTeam === "A" ? teamBAvgRating : teamAAvgRating,
    kFactor: DEFAULT_ELO_K_FACTOR,
  });

  if (winnerTeam === "A") {
    return { teamADelta: update.winnerDelta, teamBDelta: update.loserDelta };
  }
  return { teamADelta: update.loserDelta, teamBDelta: update.winnerDelta };
}

/** Catégorie P dérivée du rating sport (ELO). */
export function leagueFromRating(rating: number): PlayerCategoryId {
  return categoryFromRating(rating);
}

export type SportLeagueProgress = import("@/domain/rules/player-category").SportCategoryProgress;

export function sportLeagueProgress(sportRating: number): SportLeagueProgress {
  return sportCategoryProgress(sportRating);
}
