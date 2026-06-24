import { describe, expect, it } from "vitest";
import {
  computeChampionshipStandings,
  computePromotionRelegationMovements,
} from "@/domain/rules/championship-standings";

describe("computeChampionshipStandings", () => {
  const entries = [
    { id: "a", label: "Team A" },
    { id: "b", label: "Team B" },
    { id: "c", label: "Team C" },
  ];

  it("classe par points (3-0)", () => {
    const standings = computeChampionshipStandings(
      entries,
      [
        {
          homeEntryId: "a",
          awayEntryId: "b",
          homeSetsWon: 2,
          awaySetsWon: 0,
          winnerEntryId: "a",
        },
        {
          homeEntryId: "a",
          awayEntryId: "c",
          homeSetsWon: 2,
          awaySetsWon: 1,
          winnerEntryId: "a",
        },
        {
          homeEntryId: "b",
          awayEntryId: "c",
          homeSetsWon: 2,
          awaySetsWon: 0,
          winnerEntryId: "b",
        },
      ],
      3,
      0,
    );

    expect(standings[0]?.entryId).toBe("a");
    expect(standings[0]?.points).toBe(6);
    expect(standings[1]?.entryId).toBe("b");
    expect(standings[2]?.entryId).toBe("c");
  });
});

describe("computePromotionRelegationMovements", () => {
  it("promouvoit le haut de D3 et relègue le bas de D2", () => {
    const d1 = { id: "d1", name: "D1", levelOrder: 1, promotionSlots: 0, relegationSlots: 1 };
    const d2 = { id: "d2", name: "D2", levelOrder: 2, promotionSlots: 1, relegationSlots: 1 };
    const d3 = { id: "d3", name: "D3", levelOrder: 3, promotionSlots: 1, relegationSlots: 0 };

    const standings = new Map([
      ["d1", [{ entryId: "t1", label: "T1", played: 1, wins: 1, losses: 0, setsWon: 2, setsLost: 0, points: 3, rank: 1 }]],
      ["d2", [
        { entryId: "t2", label: "T2", played: 1, wins: 1, losses: 0, setsWon: 2, setsLost: 0, points: 3, rank: 1 },
        { entryId: "t3", label: "T3", played: 1, wins: 0, losses: 1, setsWon: 0, setsLost: 2, points: 0, rank: 2 },
      ]],
      ["d3", [
        { entryId: "t4", label: "T4", played: 1, wins: 1, losses: 0, setsWon: 2, setsLost: 0, points: 3, rank: 1 },
        { entryId: "t5", label: "T5", played: 1, wins: 0, losses: 1, setsWon: 0, setsLost: 2, points: 0, rank: 2 },
      ]],
    ]);

    const movements = computePromotionRelegationMovements([d1, d2, d3], standings);

    expect(movements.find((m) => m.entryId === "t4")?.movement).toBe("promoted");
    expect(movements.find((m) => m.entryId === "t4")?.toDivisionId).toBe("d2");
    expect(movements.find((m) => m.entryId === "t3")?.movement).toBe("relegated");
    expect(movements.find((m) => m.entryId === "t3")?.toDivisionId).toBe("d3");
  });
});
