import { describe, expect, it } from "vitest";

import {
  assignTeamsToPools,
  buildPoolMatchSchedule,
  roundRobinPairIndices,
} from "@/domain/rules/tournament-pools";
import {
  buildAmericanoRotationRounds,
  isValidAmericanoPlayerCount,
} from "@/domain/rules/tournament-americano";

describe("tournament pools", () => {
  it("splits 8 teams into two pools of 4", () => {
    const pools = assignTeamsToPools(8);
    expect(pools).toHaveLength(2);
    expect(pools[0]?.teamIndices).toHaveLength(4);
    expect(pools[1]?.teamIndices).toHaveLength(4);
  });

  it("builds round-robin for 4 teams in one pool", () => {
    expect(roundRobinPairIndices(4)).toHaveLength(6);
    expect(buildPoolMatchSchedule(8)).toHaveLength(12);
  });
});

describe("tournament americano", () => {
  it("accepts multiples of 4 players", () => {
    expect(isValidAmericanoPlayerCount(8)).toBe(true);
    expect(isValidAmericanoPlayerCount(6)).toBe(false);
  });

  it("builds rotation rounds for 8 players", () => {
    const rounds = buildAmericanoRotationRounds(8);
    expect(rounds).toHaveLength(7);
    expect(rounds[0]?.courts).toHaveLength(2);
  });
});
