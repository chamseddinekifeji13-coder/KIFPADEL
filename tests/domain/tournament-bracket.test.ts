import { describe, it, expect } from "vitest";

import {
  firstKnockoutPairingIndices,
  isPowerOfTwoTeamCount,
  knockoutRoundLabel,
} from "@/domain/rules/tournament-bracket";

describe("tournament-bracket", () => {
  it("isPowerOfTwoTeamCount", () => {
    expect(isPowerOfTwoTeamCount(1)).toBe(false);
    expect(isPowerOfTwoTeamCount(2)).toBe(true);
    expect(isPowerOfTwoTeamCount(4)).toBe(true);
    expect(isPowerOfTwoTeamCount(8)).toBe(true);
    expect(isPowerOfTwoTeamCount(6)).toBe(false);
  });

  it("firstKnockoutPairingIndices pour 8 équipes", () => {
    expect(firstKnockoutPairingIndices(8)).toEqual([
      [0, 7],
      [1, 6],
      [2, 5],
      [3, 4],
    ]);
  });

  it("knockoutRoundLabel", () => {
    expect(knockoutRoundLabel(8)).toBe("qf");
    expect(knockoutRoundLabel(4)).toBe("semi");
    expect(knockoutRoundLabel(2)).toBe("final");
  });
});
