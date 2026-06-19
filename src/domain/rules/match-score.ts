export type SetScore = { a: number; b: number };

export function parseSetScorePair(aRaw: unknown, bRaw: unknown): SetScore | null {
  const a = Number(aRaw);
  const b = Number(bRaw);
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    return null;
  }
  if (a < 0 || b < 0 || a > 7 || b > 7) {
    return null;
  }
  return { a, b };
}

/** Vainqueur d'un set padel (règles tennis simplifiées : 6 jeux + 2 d'écart, ou 7-5 / 7-6). */
export function winnerOfSet(set: SetScore): "A" | "B" | null {
  const { a, b } = set;
  if (a === b) {
    return null;
  }

  const hi = Math.max(a, b);
  const lo = Math.min(a, b);

  if (hi < 6) {
    return null;
  }
  if (hi === 6 && hi - lo >= 2) {
    return a > b ? "A" : "B";
  }
  if (hi === 7 && lo <= 6) {
    return a > b ? "A" : "B";
  }

  return null;
}

/** Match au meilleur des 3 sets : 2 sets gagnants requis. */
export function deriveMatchWinnerFromSets(sets: SetScore[]): "A" | "B" | null {
  if (sets.length < 1 || sets.length > 3) {
    return null;
  }

  let winsA = 0;
  let winsB = 0;

  for (const set of sets) {
    const winner = winnerOfSet(set);
    if (!winner) {
      return null;
    }
    if (winner === "A") {
      winsA++;
    } else {
      winsB++;
    }
  }

  if (winsA >= 2) {
    return "A";
  }
  if (winsB >= 2) {
    return "B";
  }

  return null;
}

export function validateMatchSetScores(
  sets: SetScore[],
): { ok: true; winnerTeam: "A" | "B" } | { ok: false; error: string } {
  if (sets.length === 0) {
    return { ok: false, error: "Saisissez au moins un set." };
  }
  if (sets.length > 3) {
    return { ok: false, error: "Maximum 3 sets." };
  }

  const winnerTeam = deriveMatchWinnerFromSets(sets);
  if (!winnerTeam) {
    return {
      ok: false,
      error:
        "Scores invalides — chaque set doit avoir un vainqueur (ex. 6-4, 7-5) et le match se joue au meilleur des 3 sets.",
    };
  }

  return { ok: true, winnerTeam };
}

export function formatSetScores(sets: SetScore[]): string {
  return sets.map((set) => `${set.a}-${set.b}`).join(", ");
}

export function parseSetScoresJson(raw: unknown): SetScore[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const sets: SetScore[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const parsed = parseSetScorePair(
      (item as { a?: unknown }).a,
      (item as { b?: unknown }).b,
    );
    if (!parsed) {
      return null;
    }
    sets.push(parsed);
  }

  return sets.length > 0 ? sets : null;
}
