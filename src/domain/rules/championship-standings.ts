/**
 * Classement championnat par division + calcul montée / descente.
 */

export type ChampionshipStandingRow = {
  entryId: string;
  label: string;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  points: number;
  rank: number;
};

export type ChampionshipResultInput = {
  homeEntryId: string;
  awayEntryId: string;
  homeSetsWon: number;
  awaySetsWon: number;
  winnerEntryId: string;
};

export type DivisionConfig = {
  id: string;
  name: string;
  levelOrder: number;
  promotionSlots: number;
  relegationSlots: number;
};

export type PromotionRelegationMovement = {
  entryId: string;
  fromDivisionId: string;
  toDivisionId: string;
  movement: "promoted" | "relegated" | "stayed";
};

export function computeChampionshipStandings(
  entries: { id: string; label: string }[],
  results: ChampionshipResultInput[],
  pointsPerWin: number,
  pointsPerLoss: number,
): ChampionshipStandingRow[] {
  const rows = new Map<string, ChampionshipStandingRow>();

  for (const entry of entries) {
    rows.set(entry.id, {
      entryId: entry.id,
      label: entry.label,
      played: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      points: 0,
      rank: 0,
    });
  }

  for (const result of results) {
    const home = rows.get(result.homeEntryId);
    const away = rows.get(result.awayEntryId);
    if (!home || !away) {
      continue;
    }

    home.played += 1;
    away.played += 1;
    home.setsWon += result.homeSetsWon;
    home.setsLost += result.awaySetsWon;
    away.setsWon += result.awaySetsWon;
    away.setsLost += result.homeSetsWon;

    if (result.winnerEntryId === result.homeEntryId) {
      home.wins += 1;
      home.points += pointsPerWin;
      away.losses += 1;
      away.points += pointsPerLoss;
    } else if (result.winnerEntryId === result.awayEntryId) {
      away.wins += 1;
      away.points += pointsPerWin;
      home.losses += 1;
      home.points += pointsPerLoss;
    }
  }

  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    const diffA = a.setsWon - a.setsLost;
    const diffB = b.setsWon - b.setsLost;
    if (diffB !== diffA) {
      return diffB - diffA;
    }
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return a.label.localeCompare(b.label);
  });

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

/** level_order 1 = division la plus haute (D1). */
export function computePromotionRelegationMovements(
  divisions: DivisionConfig[],
  standingsByDivisionId: Map<string, ChampionshipStandingRow[]>,
): PromotionRelegationMovement[] {
  const ordered = [...divisions].sort((a, b) => a.levelOrder - b.levelOrder);
  const movements: PromotionRelegationMovement[] = [];
  const targetDivisionByEntry = new Map<string, string>();

  for (const division of ordered) {
    const standings = standingsByDivisionId.get(division.id) ?? [];
    for (const row of standings) {
      targetDivisionByEntry.set(row.entryId, division.id);
      movements.push({
        entryId: row.entryId,
        fromDivisionId: division.id,
        toDivisionId: division.id,
        movement: "stayed",
      });
    }
  }

  for (let i = 0; i < ordered.length - 1; i += 1) {
    const upper = ordered[i]!;
    const lower = ordered[i + 1]!;
    const upperStandings = standingsByDivisionId.get(upper.id) ?? [];
    const lowerStandings = standingsByDivisionId.get(lower.id) ?? [];

    const promoted = lowerStandings.slice(0, lower.promotionSlots);
    for (const row of promoted) {
      const existing = movements.find((m) => m.entryId === row.entryId);
      if (existing) {
        existing.toDivisionId = upper.id;
        existing.movement = "promoted";
        targetDivisionByEntry.set(row.entryId, upper.id);
      }
    }

    const relegated = upperStandings.slice(Math.max(0, upperStandings.length - upper.relegationSlots));
    for (const row of relegated) {
      const currentTarget = targetDivisionByEntry.get(row.entryId);
      if (currentTarget && currentTarget !== upper.id) {
        continue;
      }
      const existing = movements.find((m) => m.entryId === row.entryId);
      if (existing) {
        existing.toDivisionId = lower.id;
        existing.movement = "relegated";
        targetDivisionByEntry.set(row.entryId, lower.id);
      }
    }
  }

  return movements;
}

export function defaultDivisionTemplates(): Omit<DivisionConfig, "id">[] {
  return [
    { name: "Division 1", levelOrder: 1, promotionSlots: 0, relegationSlots: 2 },
    { name: "Division 2", levelOrder: 2, promotionSlots: 2, relegationSlots: 2 },
    { name: "Division 3", levelOrder: 3, promotionSlots: 2, relegationSlots: 0 },
  ];
}
