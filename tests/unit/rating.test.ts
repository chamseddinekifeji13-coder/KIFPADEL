import { describe, expect, it } from "vitest";

import { calculateRatingUpdate, leagueFromRating } from "../../src/domain/rules/rating";

describe("rating rules", () => {
  it("increases winner rating and decreases loser rating", () => {
    const update = calculateRatingUpdate({
      averageWinnerRating: 1200,
      averageLoserRating: 1200,
    });

    expect(update.winnerDelta).toBeGreaterThan(0);
    expect(update.loserDelta).toBeLessThan(0);
  });

  it("maps rating to league", () => {
    expect(leagueFromRating(1100)).toBe("bronze");
    expect(leagueFromRating(1300)).toBe("silver");
    expect(leagueFromRating(1600)).toBe("gold");
    expect(leagueFromRating(1750)).toBe("platinum");
  });
});
