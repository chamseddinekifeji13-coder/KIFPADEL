import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchClubParticipantsForDateRange } from "@/modules/bookings/repository";
import type {
  ChampionshipStatus,
  ChampionshipSummary,
  LeagueDivision,
  LeagueEntry,
  LeagueMovement,
  LeagueResult,
} from "@/domain/types/championships";
import { formatChampionshipEntryLabel } from "@/domain/types/championships";

export type ProfilePick = { id: string; displayName: string | null };

function mapLeagueRow(row: Record<string, unknown>): ChampionshipSummary {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    clubName: (row.clubs as { name?: string } | null)?.name ?? null,
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    seasonLabel: String(row.season_label),
    status: row.status as ChampionshipStatus,
    pointsPerWin: Number(row.points_per_win ?? 3),
    pointsPerLoss: Number(row.points_per_loss ?? 0),
    createdAt: String(row.created_at),
  };
}

function mapDivisionRow(row: Record<string, unknown>): LeagueDivision {
  return {
    id: String(row.id),
    leagueId: String(row.league_id),
    name: String(row.name),
    levelOrder: Number(row.level_order),
    promotionSlots: Number(row.promotion_slots ?? 0),
    relegationSlots: Number(row.relegation_slots ?? 0),
  };
}

export async function listChampionshipsForClub(clubId: string): Promise<ChampionshipSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("competitive_leagues")
    .select("id, club_id, title, description, season_label, status, points_per_win, points_per_loss, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[championships.listChampionshipsForClub]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapLeagueRow(row as Record<string, unknown>));
}

export async function listDiscoverableChampionships(): Promise<ChampionshipSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("competitive_leagues")
    .select(
      "id, club_id, title, description, season_label, status, points_per_win, points_per_loss, created_at, clubs(name)",
    )
    .in("status", ["registration_open", "active"])
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[championships.listDiscoverableChampionships]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapLeagueRow(row as Record<string, unknown>));
}

export async function getChampionshipById(leagueId: string): Promise<ChampionshipSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("competitive_leagues")
    .select(
      "id, club_id, title, description, season_label, status, points_per_win, points_per_loss, created_at, clubs(name)",
    )
    .eq("id", leagueId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapLeagueRow(data as Record<string, unknown>);
}

export async function listDivisionsForLeague(leagueId: string): Promise<LeagueDivision[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("league_divisions")
    .select("id, league_id, name, level_order, promotion_slots, relegation_slots")
    .eq("league_id", leagueId)
    .order("level_order", { ascending: true });

  if (error) {
    console.warn("[championships.listDivisionsForLeague]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapDivisionRow(row as Record<string, unknown>));
}

export async function listEntriesForLeague(leagueId: string): Promise<LeagueEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("league_entries")
    .select("id, league_id, division_id, team_name, player1_id, player2_id, status")
    .eq("league_id", leagueId)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  const playerIds = [
    ...new Set(
      data.flatMap((row) => [
        String((row as { player1_id: string }).player1_id),
        String((row as { player2_id: string }).player2_id),
      ]),
    ),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", playerIds);

  const nameById = new Map(
    (profiles ?? []).map((p) => [String((p as { id: string }).id), (p as { display_name?: string | null }).display_name]),
  );

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const player1Id = String(r.player1_id);
    const player2Id = String(r.player2_id);
    return {
      id: String(r.id),
      leagueId: String(r.league_id),
      divisionId: String(r.division_id),
      teamName: (r.team_name as string | null) ?? null,
      player1Id,
      player2Id,
      player1Name: nameById.get(player1Id) ?? null,
      player2Name: nameById.get(player2Id) ?? null,
      status: r.status as LeagueEntry["status"],
    };
  });
}

export async function listResultsForLeague(leagueId: string): Promise<LeagueResult[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("league_results")
    .select(
      "id, league_id, division_id, home_entry_id, away_entry_id, home_sets_won, away_sets_won, winner_entry_id, played_at",
    )
    .eq("league_id", leagueId)
    .order("played_at", { ascending: false });

  if (error) {
    console.warn("[championships.listResultsForLeague]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      leagueId: String(r.league_id),
      divisionId: String(r.division_id),
      homeEntryId: String(r.home_entry_id),
      awayEntryId: String(r.away_entry_id),
      homeSetsWon: Number(r.home_sets_won),
      awaySetsWon: Number(r.away_sets_won),
      winnerEntryId: String(r.winner_entry_id),
      playedAt: String(r.played_at),
    };
  });
}

export async function listMovementsForLeague(leagueId: string): Promise<LeagueMovement[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("league_movements")
    .select("id, entry_id, from_division_id, to_division_id, movement, season_label, created_at")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const entries = await listEntriesForLeague(leagueId);
  const divisions = await listDivisionsForLeague(leagueId);
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const divisionById = new Map(divisions.map((d) => [d.id, d]));

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const entryId = String(r.entry_id);
    const entry = entryById.get(entryId);
    const fromId = String(r.from_division_id);
    const toId = String(r.to_division_id);
    return {
      id: String(r.id),
      entryId,
      fromDivisionId: fromId,
      toDivisionId: toId,
      movement: r.movement as LeagueMovement["movement"],
      seasonLabel: String(r.season_label),
      createdAt: String(r.created_at),
      teamLabel: entry ? formatChampionshipEntryLabel(entry) : undefined,
      fromDivisionName: divisionById.get(fromId)?.name,
      toDivisionName: divisionById.get(toId)?.name,
    };
  });
}

export async function listClubPlayerPicksForChampionship(
  clubId: string,
  excludeUserId?: string,
  limit = 60,
): Promise<ProfilePick[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 90);
  const startYmd = start.toISOString().slice(0, 10);
  const endYmd = today.toISOString().slice(0, 10);

  const participantRows = await fetchClubParticipantsForDateRange(clubId, startYmd, endYmd);
  const ids = [
    ...new Set(
      participantRows
        .map((row) => row.player_id)
        .filter((id): id is string => Boolean(id) && id !== excludeUserId),
    ),
  ].slice(0, limit);
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", ids);

  if (error) {
    return [];
  }

  const byId = new Map(
    (data ?? []).map((row) => [
      String((row as { id: string }).id),
      (row as { display_name?: string | null }).display_name ?? null,
    ]),
  );

  return ids
    .map((id) => ({ id, displayName: byId.get(id) ?? null }))
    .filter((p) => p.displayName)
    .sort((a, b) => (a.displayName ?? "").localeCompare(b.displayName ?? ""));
}

/** Joueurs du club (réservations récentes), avec repli sur le répertoire global pour le staff. */
export async function listStaffPlayerPicksForChampionship(
  clubId: string,
  limit = 60,
): Promise<ProfilePick[]> {
  const clubPlayers = await listClubPlayerPicksForChampionship(clubId, undefined, limit);
  if (clubPlayers.length > 0) {
    return clubPlayers;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .not("display_name", "is", null)
    .order("display_name", { ascending: true })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    displayName: (row as { display_name?: string | null }).display_name ?? null,
  }));
}

export async function listPartnerCandidatesForChampionship(
  userId: string,
  clubId?: string,
  limit = 40,
): Promise<ProfilePick[]> {
  if (clubId) {
    const clubPlayers = await listClubPlayerPicksForChampionship(clubId, userId, limit);
    if (clubPlayers.length > 0) {
      return clubPlayers;
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .neq("id", userId)
    .not("display_name", "is", null)
    .order("display_name", { ascending: true })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    displayName: (row as { display_name?: string | null }).display_name ?? null,
  }));
}

export async function countActiveEntriesForLeague(leagueId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("league_entries")
    .select("id", { count: "exact", head: true })
    .eq("league_id", leagueId)
    .neq("status", "withdrawn");

  if (error) {
    return 0;
  }
  return count ?? 0;
}

export async function playerAlreadyInChampionship(leagueId: string, userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("league_entries")
    .select("id")
    .eq("league_id", leagueId)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .neq("status", "withdrawn")
    .limit(1);

  return Boolean(data?.length);
}
