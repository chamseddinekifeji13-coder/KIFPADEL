import type { UUID } from "./core";

export type TournamentFormat = "knockout";

export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TournamentEntryStatus = "registered" | "withdrawn" | "checked_in";

export type Tournament = {
  id: UUID;
  clubId: UUID;
  createdBy: UUID;
  title: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  entryFeeCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TournamentEntry = {
  id: UUID;
  tournamentId: UUID;
  teamName: string | null;
  player1Id: UUID;
  player2Id: UUID;
  status: TournamentEntryStatus;
  seed: number | null;
  createdAt: string;
};

export type TournamentMatch = {
  id: UUID;
  tournamentId: UUID;
  round: string;
  position: number;
  matchId: string | null;
  team1EntryId: string | null;
  team2EntryId: string | null;
  scheduledStartsAt: string | null;
  courtId: string | null;
  createdAt: string;
};
