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

/** Lower bounds for sport tiers (same breakpoints as leagueFromRating). */
export const SPORT_LEAGUE_FLOOR_SILVER = 1150;
export const SPORT_LEAGUE_FLOOR_GOLD = 1400;
export const SPORT_LEAGUE_FLOOR_PLATINUM = 1700;

export type SportLeagueProgress = {
  sportRating: number;
  prevFloor: number;
  nextFloor: number;
  nextTierLabel: string | null;
  progressPercent: number;
  isMaxTier: boolean;
};

/**
 * Progress toward the next sport tier (ELO-like rating), not trust score.
 */
export function sportLeagueProgress(sportRating: number): SportLeagueProgress {
  const r = sportRating;
  if (r >= SPORT_LEAGUE_FLOOR_PLATINUM) {
    return {
      sportRating: r,
      prevFloor: SPORT_LEAGUE_FLOOR_PLATINUM,
      nextFloor: SPORT_LEAGUE_FLOOR_PLATINUM,
      nextTierLabel: null,
      progressPercent: 100,
      isMaxTier: true,
    };
  }
  if (r >= SPORT_LEAGUE_FLOOR_GOLD) {
    const span = SPORT_LEAGUE_FLOOR_PLATINUM - SPORT_LEAGUE_FLOOR_GOLD;
    return {
      sportRating: r,
      prevFloor: SPORT_LEAGUE_FLOOR_GOLD,
      nextFloor: SPORT_LEAGUE_FLOOR_PLATINUM,
      nextTierLabel: "Platine",
      progressPercent: Math.min(100, ((r - SPORT_LEAGUE_FLOOR_GOLD) / span) * 100),
      isMaxTier: false,
    };
  }
  if (r >= SPORT_LEAGUE_FLOOR_SILVER) {
    const span = SPORT_LEAGUE_FLOOR_GOLD - SPORT_LEAGUE_FLOOR_SILVER;
    return {
      sportRating: r,
      prevFloor: SPORT_LEAGUE_FLOOR_SILVER,
      nextFloor: SPORT_LEAGUE_FLOOR_GOLD,
      nextTierLabel: "Or",
      progressPercent: Math.min(100, ((r - SPORT_LEAGUE_FLOOR_SILVER) / span) * 100),
      isMaxTier: false,
    };
  }
  const span = SPORT_LEAGUE_FLOOR_SILVER;
  return {
    sportRating: r,
    prevFloor: 0,
    nextFloor: SPORT_LEAGUE_FLOOR_SILVER,
    nextTierLabel: "Argent",
    progressPercent: Math.min(100, (r / span) * 100),
    isMaxTier: false,
  };
}
