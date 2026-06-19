import { describe, expect, it } from "vitest";

import {
  deriveMatchWinnerFromSets,
  formatSetScores,
  validateMatchSetScores,
  winnerOfSet,
} from "@/domain/rules/match-score";

describe("winnerOfSet", () => {
  it("accepts classic padel set scores", () => {
    expect(winnerOfSet({ a: 6, b: 4 })).toBe("A");
    expect(winnerOfSet({ a: 4, b: 6 })).toBe("B");
    expect(winnerOfSet({ a: 7, b: 5 })).toBe("A");
    expect(winnerOfSet({ a: 6, b: 7 })).toBe("B");
  });

  it("rejects ties and incomplete sets", () => {
    expect(winnerOfSet({ a: 5, b: 5 })).toBeNull();
    expect(winnerOfSet({ a: 5, b: 4 })).toBeNull();
    expect(winnerOfSet({ a: 8, b: 6 })).toBeNull();
  });
});

describe("deriveMatchWinnerFromSets", () => {
  it("requires two sets won for a best-of-three match", () => {
    expect(
      deriveMatchWinnerFromSets([
        { a: 6, b: 4 },
        { a: 6, b: 3 },
      ]),
    ).toBe("A");

    expect(
      deriveMatchWinnerFromSets([
        { a: 6, b: 4 },
        { a: 4, b: 6 },
        { a: 7, b: 5 },
      ]),
    ).toBe("A");

    expect(deriveMatchWinnerFromSets([{ a: 6, b: 4 }])).toBeNull();
  });
});

describe("validateMatchSetScores", () => {
  it("formats valid score lines", () => {
    const result = validateMatchSetScores([
      { a: 6, b: 4 },
      { a: 3, b: 6 },
      { a: 7, b: 6 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerTeam).toBe("A");
    }
    expect(
      formatSetScores([
        { a: 6, b: 4 },
        { a: 3, b: 6 },
        { a: 7, b: 6 },
      ]),
    ).toBe("6-4, 3-6, 7-6");
  });
});
