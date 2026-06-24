export type ChampionshipStatus =
  | "draft"
  | "registration_open"
  | "active"
  | "completed"
  | "cancelled";

export type LeagueEntryStatus = "registered" | "active" | "withdrawn";

export type LeagueMovementType = "promoted" | "relegated" | "stayed";

export type ChampionshipSummary = {
  id: string;
  clubId: string;
  clubName?: string | null;
  title: string;
  description: string | null;
  seasonLabel: string;
  status: ChampionshipStatus;
  pointsPerWin: number;
  pointsPerLoss: number;
  createdAt: string;
};

export type LeagueDivision = {
  id: string;
  leagueId: string;
  name: string;
  levelOrder: number;
  promotionSlots: number;
  relegationSlots: number;
};

export type LeagueEntry = {
  id: string;
  leagueId: string;
  divisionId: string;
  teamName: string | null;
  player1Id: string;
  player2Id: string;
  player1Name?: string | null;
  player2Name?: string | null;
  status: LeagueEntryStatus;
};

export type LeagueResult = {
  id: string;
  leagueId: string;
  divisionId: string;
  homeEntryId: string;
  awayEntryId: string;
  homeSetsWon: number;
  awaySetsWon: number;
  winnerEntryId: string;
  playedAt: string;
};

export type LeagueMovement = {
  id: string;
  entryId: string;
  fromDivisionId: string;
  toDivisionId: string;
  movement: LeagueMovementType;
  seasonLabel: string;
  createdAt: string;
  teamLabel?: string;
  fromDivisionName?: string;
  toDivisionName?: string;
};
