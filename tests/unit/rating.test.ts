import { describe, expect, it } from "vitest";

import {
  calculateRatingUpdate,
  DEFAULT_ELO_K_FACTOR,
  leagueFromRating,
  previewTeamEloImpact,
} from "../../src/domain/rules/rating";

describe("rating rules", () => {
  it("uses K=32 by default (aligned with SQL trigger)", () => {
    const update = calculateRatingUpdate({
      averageWinnerRating: 1200,
      averageLoserRating: 1200,
    });

    expect(DEFAULT_ELO_K_FACTOR).toBe(32);
    expect(update.winnerDelta).toBe(16);
    expect(update.loserDelta).toBe(-16);
  });

  it("increases winner rating and decreases loser rating", () => {
    const update = calculateRatingUpdate({
      averageWinnerRating: 1200,
      averageLoserRating: 1200,
    });

    expect(update.winnerDelta).toBeGreaterThan(0);
    expect(update.loserDelta).toBeLessThan(0);
  });

  it("previews team deltas from match winner", () => {
    const impact = previewTeamEloImpact(1300, 1100, "B");
    expect(impact.teamBDelta).toBeGreaterThan(0);
    expect(impact.teamADelta).toBeLessThan(0);
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
