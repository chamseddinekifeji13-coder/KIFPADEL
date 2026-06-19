import { parseAmericanoRoundNumber } from "@/domain/rules/tournament-americano";
import {
  assignTeamsToPools,
  computePoolStandings,
  parsePoolLabelFromRound,
} from "@/domain/rules/tournament-pools";
import {
  computeClubStandingsFromAmericano,
  computeClubStandingsFromTeamResults,
} from "@/domain/rules/tournament-club-standings";
import type { TournamentParticipatingClub } from "@/domain/rules/tournament-club-standings";
import {
  filterItemsByCategory,
  hasMultipleDisplayCategories,
  listDisplayCategories,
  tournamentCategoryLabel,
  type TournamentCategory,
} from "@/domain/rules/tournament-categories";
import type { TournamentFormat } from "@/domain/types/tournaments";

export type DisplayMatch = {
  id: string;
  round: string;
  position: number;
  team1Label: string;
  team2Label: string;
  winnerTeam: "A" | "B" | null;
  setScores: { a: number; b: number }[] | null;
};

export type DisplayStandingRow = {
  id: string;
  rank: number;
  label: string;
  primary: string;
  secondary?: string;
};

export type DisplayPoolBlock = {
  poolLabel: string;
  rows: DisplayStandingRow[];
};

function formatRoundLabel(round: string, locale: string): string {
  const pool = parsePoolLabelFromRound(round);
  if (pool) {
    return locale === "en" ? `Pool ${pool}` : `Poule ${pool}`;
  }
  if (round.startsWith("americano-r")) {
    const n = round.replace("americano-r", "");
    return locale === "en" ? `Rotation ${n}` : `Rotation ${n}`;
  }
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16 finale", en: "Round of 32" },
    r16: { fr: "1/8 finale", en: "Round of 16" },
    qf: { fr: "Quarts de finale", en: "Quarter-finals" },
    semi: { fr: "Demi-finales", en: "Semi-finals" },
    final: { fr: "Finale", en: "Final" },
  };
  const hit = labels[round];
  if (hit) {
    return locale === "en" ? hit.en : hit.fr;
  }
  return round;
}

export function buildDisplayMatchRows(
  format: TournamentFormat,
  locale: string,
  entries: { id: string; player1Name: string; player2Name: string }[],
  soloEntries: { id: string; playerName: string }[],
  matches: {
    id: string;
    round: string;
    position: number;
    team1EntryId: string | null;
    team2EntryId: string | null;
    winnerTeam: "A" | "B" | null;
    setScores: { a: number; b: number }[] | null;
  }[],
): DisplayMatch[] {
  const entryLabel = (id: string | null): string => {
    if (!id) {
      return "—";
    }
    const team = entries.find((e) => e.id === id);
    if (team) {
      return `${team.player1Name} / ${team.player2Name}`;
    }
    const solo = soloEntries.find((e) => e.id === id);
    if (solo) {
      return solo.playerName;
    }
    return "—";
  };

  return matches.map((m) => {
    if (format === "americano") {
      const rotation = parseAmericanoRoundNumber(m.round);
      return {
        id: m.id,
        round: m.round,
        position: m.position,
        team1Label: rotation
          ? locale === "en"
            ? `Court ${m.position + 1}`
            : `Terrain ${m.position + 1}`
          : formatRoundLabel(m.round, locale),
        team2Label: rotation
          ? locale === "en"
            ? `Rotation ${rotation}`
            : `Rotation ${rotation}`
          : "Américano",
        winnerTeam: m.winnerTeam,
        setScores: m.setScores,
      };
    }

    return {
      id: m.id,
      round: m.round,
      position: m.position,
      team1Label: entryLabel(m.team1EntryId),
      team2Label: entryLabel(m.team2EntryId),
      winnerTeam: m.winnerTeam,
      setScores: m.setScores,
    };
  });
}

export function buildAmericanoDisplayStandings(
  soloEntries: { id: string; playerName: string; americanoPoints: number }[],
): DisplayStandingRow[] {
  return [...soloEntries]
    .sort((a, b) => b.americanoPoints - a.americanoPoints)
    .map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
      label: entry.playerName,
      primary: `${entry.americanoPoints} pts`,
    }));
}

export function buildPoolDisplayBlocks(
  activeEntries: { id: string; player1Name: string; player2Name: string }[],
  matches: {
    round: string;
    team1EntryId: string | null;
    team2EntryId: string | null;
    winnerTeam: "A" | "B" | null;
  }[],
): DisplayPoolBlock[] {
  const poolLabels = assignTeamsToPools(activeEntries.length).map((p) => p.poolLabel);
  const entryRows = activeEntries.map((e) => ({
    id: e.id,
    label: `${e.player1Name} / ${e.player2Name}`,
  }));
  const matchRows = matches.map((m) => ({
    poolLabel: parsePoolLabelFromRound(m.round) ?? "",
    team1EntryId: m.team1EntryId,
    team2EntryId: m.team2EntryId,
    winnerTeam: m.winnerTeam,
  }));

  return poolLabels.map((poolLabel) => ({
    poolLabel,
    rows: computePoolStandings(entryRows, matchRows, poolLabel).map((row, index) => ({
      id: row.entryId,
      rank: index + 1,
      label: row.label,
      primary: `${row.wins}V`,
      secondary: `${row.losses}D`,
    })),
  }));
}

export type DisplayCategorySection = {
  category: TournamentCategory | null;
  label: string;
  matches: DisplayMatch[];
  americanoStandings: DisplayStandingRow[];
  poolBlocks: DisplayPoolBlock[];
};

export function buildDisplayCategorySections(args: {
  locale: string;
  format: TournamentFormat;
  configuredCategories: TournamentCategory[];
  entries: {
    id: string;
    player1Name: string;
    player2Name: string;
    representingClubId: string | null;
    category: TournamentCategory | null;
    status: string;
  }[];
  soloEntries: {
    id: string;
    playerName: string;
    americanoPoints: number;
    representingClubId: string | null;
    category: TournamentCategory | null;
    status: string;
  }[];
  matches: {
    id: string;
    round: string;
    position: number;
    team1EntryId: string | null;
    team2EntryId: string | null;
    winnerTeam: "A" | "B" | null;
    setScores: { a: number; b: number }[] | null;
    category: TournamentCategory | null;
  }[];
}): { sections: DisplayCategorySection[]; multiCategory: boolean } {
  const activeEntries = args.entries.filter((e) => e.status !== "withdrawn");
  const activeSolo = args.soloEntries.filter((e) => e.status !== "withdrawn");
  const displayCategories = listDisplayCategories(
    args.configuredCategories,
    activeEntries,
    args.matches,
    activeSolo,
  );

  const sections = displayCategories.map((category) => {
    const catEntries = filterItemsByCategory(activeEntries, category);
    const catSolo = filterItemsByCategory(activeSolo, category);
    const catMatches = filterItemsByCategory(args.matches, category);

    return {
      category,
      label: tournamentCategoryLabel(category, args.locale),
      matches: buildDisplayMatchRows(
        args.format,
        args.locale,
        catEntries,
        catSolo,
        catMatches,
      ),
      americanoStandings:
        args.format === "americano" ? buildAmericanoDisplayStandings(catSolo) : [],
      poolBlocks: args.format === "pools" ? buildPoolDisplayBlocks(catEntries, catMatches) : [],
    };
  });

  return {
    sections,
    multiCategory: hasMultipleDisplayCategories(displayCategories),
  };
}

export function buildClubDisplayStandings(
  format: TournamentFormat,
  participatingClubs: TournamentParticipatingClub[],
  activeEntries: { id: string; representingClubId: string | null }[],
  activeSolo: { representingClubId: string | null; americanoPoints: number }[],
  matches: {
    team1EntryId: string | null;
    team2EntryId: string | null;
    winnerTeam: "A" | "B" | null;
  }[],
): DisplayStandingRow[] {
  const rows =
    format === "americano"
      ? computeClubStandingsFromAmericano(participatingClubs, activeSolo)
      : computeClubStandingsFromTeamResults(
          participatingClubs,
          activeEntries.map((e) => ({ id: e.id, representingClubId: e.representingClubId })),
          matches,
        );

  return rows.map((row, index) => ({
    id: row.clubId,
    rank: index + 1,
    label: row.clubName,
    primary:
      format === "americano" ? `${row.americanoPoints} pts` : `${row.wins}V · ${row.losses}D`,
  }));
}

export { formatRoundLabel };
