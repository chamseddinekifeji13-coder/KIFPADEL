/**
 * Américano : rotation des partenaires, inscription solo.
 * V1 : 4, 8, 12 ou 16 joueurs (multiple de 4).
 */

export type AmericanoCourtMatch = {
  round: number;
  court: number;
  playerIds: [string, string, string, string];
};

export type AmericanoRound = {
  round: number;
  courts: { a1: number; a2: number; b1: number; b2: number }[];
};

export function isValidAmericanoPlayerCount(count: number): boolean {
  return count >= 4 && count % 4 === 0;
}

/**
 * Génère les rotations (indices 0..n-1) : chaque round, n/4 matchs de 4 joueurs.
 */
export function buildAmericanoRotationRounds(playerCount: number): AmericanoRound[] {
  if (!isValidAmericanoPlayerCount(playerCount)) {
    throw new Error("Le nombre de joueurs Américano doit être 4, 8, 12 ou 16.");
  }

  const rounds: AmericanoRound[] = [];
  const order = Array.from({ length: playerCount }, (_, i) => i);

  for (let r = 0; r < playerCount - 1; r += 1) {
    const courts: AmericanoRound["courts"] = [];
    const matchesPerRound = playerCount / 4;

    for (let c = 0; c < matchesPerRound; c += 1) {
      const base = c * 4;
      courts.push({
        a1: order[base]!,
        a2: order[base + 1]!,
        b1: order[base + 2]!,
        b2: order[base + 3]!,
      });
    }

    rounds.push({ round: r + 1, courts });
    order.push(order.shift()!);
  }

  return rounds;
}

export function americanoRoundLabel(round: number): string {
  return `americano-r${round}`;
}

export function parseAmericanoRoundNumber(round: string): number | null {
  if (!round.startsWith("americano-r")) {
    return null;
  }
  const n = Number.parseInt(round.slice("americano-r".length), 10);
  return Number.isFinite(n) ? n : null;
}

/** Points individuels : chaque joueur cumule les jeux marqués par son équipe. */
export function americanoPointsFromSetScores(
  playerIds: [string, string, string, string],
  setScores: { a: number; b: number }[],
): Record<string, number> {
  const teamAPoints = setScores.reduce((sum, set) => sum + set.a, 0);
  const teamBPoints = setScores.reduce((sum, set) => sum + set.b, 0);

  return {
    [playerIds[0]]: teamAPoints,
    [playerIds[1]]: teamAPoints,
    [playerIds[2]]: teamBPoints,
    [playerIds[3]]: teamBPoints,
  };
}

export function formatTournamentFormatLabel(format: string, locale = "fr"): string {
  if (format === "pools") {
    return locale === "en" ? "Pools" : "Poules";
  }
  if (format === "americano") {
    return "Américano";
  }
  return locale === "en" ? "Knockout" : "Élimination directe";
}
