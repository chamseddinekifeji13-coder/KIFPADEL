/**
 * Poules : round-robin par groupe de 4 équipes (extensible).
 */

export type PoolAssignment = {
  poolLabel: string;
  teamIndices: number[];
};

export type PoolMatchSlot = {
  poolLabel: string;
  teamIndexA: number;
  teamIndexB: number;
};

const POOL_LABELS = "ABCDEFGH";

/** Répartit les équipes en poules de 4 (dernière poule peut être plus petite). */
export function assignTeamsToPools(teamCount: number, poolSize = 4): PoolAssignment[] {
  if (teamCount < 3 || poolSize < 3) {
    return [];
  }

  const poolCount = Math.max(1, Math.ceil(teamCount / poolSize));
  const pools: PoolAssignment[] = [];
  let cursor = 0;

  for (let p = 0; p < poolCount; p += 1) {
    const remaining = teamCount - cursor;
    const remainingPools = poolCount - p;
    const size = Math.ceil(remaining / remainingPools);
    const indices: number[] = [];
    for (let i = 0; i < size; i += 1) {
      indices.push(cursor + i);
    }
    cursor += size;
    pools.push({
      poolLabel: POOL_LABELS[p] ?? `P${p + 1}`,
      teamIndices: indices,
    });
  }

  return pools;
}

/** Toutes les paires d'un round-robin (indices locaux 0..n-1). */
export function roundRobinPairIndices(teamCountInPool: number): [number, number][] {
  if (teamCountInPool < 2) {
    return [];
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < teamCountInPool; i += 1) {
    for (let j = i + 1; j < teamCountInPool; j += 1) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

export function buildPoolMatchSchedule(teamCount: number, poolSize = 4): PoolMatchSlot[] {
  const pools = assignTeamsToPools(teamCount, poolSize);
  const slots: PoolMatchSlot[] = [];

  for (const pool of pools) {
    const localPairs = roundRobinPairIndices(pool.teamIndices.length);
    for (const [localA, localB] of localPairs) {
      slots.push({
        poolLabel: pool.poolLabel,
        teamIndexA: pool.teamIndices[localA]!,
        teamIndexB: pool.teamIndices[localB]!,
      });
    }
  }

  return slots;
}

export type PoolStandingRow = {
  entryId: string;
  label: string;
  played: number;
  wins: number;
  losses: number;
};

export function computePoolStandings(
  entries: { id: string; label: string }[],
  matches: {
    poolLabel: string;
    team1EntryId: string | null;
    team2EntryId: string | null;
    winnerTeam: "A" | "B" | null;
  }[],
  poolLabel: string,
): PoolStandingRow[] {
  const poolEntryIds = new Set(
    matches
      .filter((m) => m.poolLabel === poolLabel)
      .flatMap((m) => [m.team1EntryId, m.team2EntryId])
      .filter((id): id is string => Boolean(id)),
  );

  const rows = new Map<string, PoolStandingRow>();
  for (const entry of entries) {
    if (!poolEntryIds.has(entry.id)) {
      continue;
    }
    rows.set(entry.id, {
      entryId: entry.id,
      label: entry.label,
      played: 0,
      wins: 0,
      losses: 0,
    });
  }

  for (const match of matches) {
    if (match.poolLabel !== poolLabel || !match.winnerTeam) {
      continue;
    }
    const winnerId =
      match.winnerTeam === "A" ? match.team1EntryId : match.team2EntryId;
    const loserId =
      match.winnerTeam === "A" ? match.team2EntryId : match.team1EntryId;
    if (!winnerId || !loserId) {
      continue;
    }
    const winner = rows.get(winnerId);
    const loser = rows.get(loserId);
    if (!winner || !loser) {
      continue;
    }
    winner.played += 1;
    winner.wins += 1;
    loser.played += 1;
    loser.losses += 1;
  }

  return [...rows.values()].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return a.losses - b.losses;
  });
}

export function poolRoundLabel(poolLabel: string): string {
  return `pool-${poolLabel.toLowerCase()}`;
}

export function parsePoolLabelFromRound(round: string): string | null {
  if (!round.startsWith("pool-")) {
    return null;
  }
  return round.slice("pool-".length).toUpperCase();
}

export function canGeneratePoolSchedule(teamCount: number): boolean {
  return teamCount >= 3;
}
