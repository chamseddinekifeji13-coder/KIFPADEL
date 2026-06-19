import { describe, expect, it } from "vitest";

import {
  computeClubStandingsFromAmericano,
  computeClubStandingsFromTeamResults,
  type TournamentParticipatingClub,
} from "@/domain/rules/tournament-club-standings";

const participating: TournamentParticipatingClub[] = [
  {
    id: "1",
    tournamentId: "t1",
    clubId: "club-a",
    clubName: "Club A",
    clubCity: "Tunis",
    role: "host",
    status: "accepted",
  },
  {
    id: "2",
    tournamentId: "t1",
    clubId: "club-b",
    clubName: "Club B",
    clubCity: "Sfax",
    role: "invited",
    status: "accepted",
  },
];

describe("computeClubStandingsFromTeamResults", () => {
  it("agrège les victoires par club", () => {
    const standings = computeClubStandingsFromTeamResults(
      participating,
      [
        { id: "e1", representingClubId: "club-a" },
        { id: "e2", representingClubId: "club-b" },
        { id: "e3", representingClubId: "club-a" },
        { id: "e4", representingClubId: "club-b" },
      ],
      [
        { team1EntryId: "e1", team2EntryId: "e2", winnerTeam: "A" },
        { team1EntryId: "e3", team2EntryId: "e4", winnerTeam: "B" },
      ],
    );

    expect(standings[0]?.clubId).toBe("club-a");
    expect(standings[0]?.wins).toBe(1);
    expect(standings[1]?.clubId).toBe("club-b");
    expect(standings[1]?.wins).toBe(1);
  });
});

describe("computeClubStandingsFromAmericano", () => {
  it("somme les points solo par club", () => {
    const standings = computeClubStandingsFromAmericano(participating, [
      { representingClubId: "club-a", americanoPoints: 12 },
      { representingClubId: "club-a", americanoPoints: 8 },
      { representingClubId: "club-b", americanoPoints: 15 },
    ]);

    expect(standings[0]?.clubId).toBe("club-a");
    expect(standings[0]?.americanoPoints).toBe(20);
    expect(standings[1]?.clubId).toBe("club-b");
    expect(standings[1]?.americanoPoints).toBe(15);
  });
});
