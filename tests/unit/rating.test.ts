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

  it("maps rating to P category", () => {
    expect(leagueFromRating(1100)).toBe("p25");
    expect(leagueFromRating(1200)).toBe("p50");
    expect(leagueFromRating(1300)).toBe("p100");
    expect(leagueFromRating(1500)).toBe("p250");
    expect(leagueFromRating(1650)).toBe("p500");
    expect(leagueFromRating(1800)).toBe("p1000");
  });
});
