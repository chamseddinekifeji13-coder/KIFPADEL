export type ParticipatingClubStatus = "pending" | "accepted" | "declined";

export type ParticipatingClubRole = "host" | "invited";

export type TournamentParticipatingClub = {
  id: string;
  tournamentId: string;
  clubId: string;
  clubName: string;
  clubCity: string;
  role: ParticipatingClubRole;
  status: ParticipatingClubStatus;
};

export type ClubTournamentStanding = {
  clubId: string;
  clubName: string;
  wins: number;
  losses: number;
  americanoPoints: number;
  entriesCount: number;
};

type EntryClubRef = {
  id: string;
  representingClubId: string | null;
};

type MatchClubResult = {
  team1EntryId: string | null;
  team2EntryId: string | null;
  winnerTeam: "A" | "B" | null;
};

/**
 * Classement inter-clubs sur les victoires d'équipes (KO / poules).
 */
export function computeClubStandingsFromTeamResults(
  participating: TournamentParticipatingClub[],
  entries: EntryClubRef[],
  matches: MatchClubResult[],
): ClubTournamentStanding[] {
  const clubNameById = new Map(participating.map((p) => [p.clubId, p.clubName]));
  const entryClubById = new Map(
    entries
      .filter((e) => e.representingClubId)
      .map((e) => [e.id, e.representingClubId as string]),
  );

  const rows = new Map<string, ClubTournamentStanding>();
  for (const club of participating.filter((p) => p.status === "accepted")) {
    rows.set(club.clubId, {
      clubId: club.clubId,
      clubName: club.clubName,
      wins: 0,
      losses: 0,
      americanoPoints: 0,
      entriesCount: entries.filter((e) => e.representingClubId === club.clubId).length,
    });
  }

  for (const match of matches) {
    if (!match.winnerTeam || !match.team1EntryId || !match.team2EntryId) {
      continue;
    }
    const winnerEntryId = match.winnerTeam === "A" ? match.team1EntryId : match.team2EntryId;
    const loserEntryId = match.winnerTeam === "A" ? match.team2EntryId : match.team1EntryId;
    const winnerClubId = entryClubById.get(winnerEntryId);
    const loserClubId = entryClubById.get(loserEntryId);
    if (winnerClubId && rows.has(winnerClubId)) {
      rows.get(winnerClubId)!.wins += 1;
    }
    if (loserClubId && rows.has(loserClubId)) {
      rows.get(loserClubId)!.losses += 1;
    }
  }

  return [...rows.values()].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return a.losses - b.losses;
  });
}

/**
 * Classement inter-clubs Américano : somme des points solo par club.
 */
export function computeClubStandingsFromAmericano(
  participating: TournamentParticipatingClub[],
  soloEntries: { representingClubId: string | null; americanoPoints: number }[],
): ClubTournamentStanding[] {
  const rows = new Map<string, ClubTournamentStanding>();

  for (const club of participating.filter((p) => p.status === "accepted")) {
    rows.set(club.clubId, {
      clubId: club.clubId,
      clubName: club.clubName,
      wins: 0,
      losses: 0,
      americanoPoints: 0,
      entriesCount: 0,
    });
  }

  for (const entry of soloEntries) {
    if (!entry.representingClubId || !rows.has(entry.representingClubId)) {
      continue;
    }
    const row = rows.get(entry.representingClubId)!;
    row.americanoPoints += entry.americanoPoints;
    row.entriesCount += 1;
  }

  return [...rows.values()].sort((a, b) => b.americanoPoints - a.americanoPoints);
}
