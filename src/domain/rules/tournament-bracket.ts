/**
 * V1 knockout bracket helpers.
 * TODO: byes when team count is not a power of 2; later rounds auto-generation.
 */

/** True iff n is a power of 2 and n >= 2. */
export function isPowerOfTwoTeamCount(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  return (n & (n - 1)) === 0;
}

/**
 * First knockout round label from number of teams at start of bracket.
 * e.g. 16 -> r16, 8 -> qf, 4 -> semi, 2 -> final
 */
export function knockoutRoundLabel(teamCount: number): string {
  if (teamCount === 32) return "r32";
  if (teamCount >= 16) return "r16";
  if (teamCount === 8) return "qf";
  if (teamCount === 4) return "semi";
  if (teamCount === 2) return "final";
  return `r${teamCount}`;
}

/**
 * Standard seeding: (1 vs n), (2 vs n-1), … using 1-based seed indices into ordered entries.
 * Returns pairs of indices into the sorted entries array (by strength).
 */
export function firstKnockoutPairingIndices(teamCount: number): [number, number][] {
  if (!isPowerOfTwoTeamCount(teamCount)) {
    throw new Error("Team count must be a power of 2 (V1).");
  }
  const half = teamCount / 2;
  const pairs: [number, number][] = [];
  for (let i = 0; i < half; i += 1) {
    pairs.push([i, teamCount - 1 - i]);
  }
  return pairs;
}
