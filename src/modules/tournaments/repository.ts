import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import type { Tournament, TournamentEntry, TournamentMatch, TournamentScope, TournamentFormat } from "@/domain/types/tournaments";
import type { MatchGenderType } from "@/domain/types/core";
import {
  firstKnockoutPairingIndices,
  isPowerOfTwoTeamCount,
  knockoutRoundLabel,
} from "@/domain/rules/tournament-bracket";
import { parseSetScoresJson } from "@/domain/rules/match-score";
import {
  buildAmericanoRotationRounds,
  americanoRoundLabel,
} from "@/domain/rules/tournament-americano";
import {
  buildPoolMatchSchedule,
  poolRoundLabel,
} from "@/domain/rules/tournament-pools";

type TournamentRow = Record<string, unknown>;
type EntryRow = Record<string, unknown>;
type TournamentMatchRow = Record<string, unknown>;

function mapTournament(row: TournamentRow): Tournament {
  const scopeRaw = row.tournament_scope;
  const scope: TournamentScope =
    scopeRaw === "interclub" ||
    scopeRaw === "inter_region" ||
    scopeRaw === "platform" ||
    scopeRaw === "single_club"
      ? scopeRaw
      : "single_club";
  const formatRaw = row.format;
  const format: TournamentFormat =
    formatRaw === "pools" || formatRaw === "americano" || formatRaw === "knockout"
      ? formatRaw
      : "knockout";
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    createdBy: String(row.created_by),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    format,
    tournamentScope: scope,
    scopeMetadata:
      row.scope_metadata != null && typeof row.scope_metadata === "object"
        ? (row.scope_metadata as Record<string, unknown>)
        : {},
    status: row.status as Tournament["status"],
    entryFeeCents: row.entry_fee_cents != null ? Number(row.entry_fee_cents) : null,
    startsAt: row.starts_at != null ? String(row.starts_at) : null,
    endsAt: row.ends_at != null ? String(row.ends_at) : null,
    settings: (row.settings as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapEntry(row: EntryRow): TournamentEntry {
  return {
    id: String(row.id),
    tournamentId: String(row.tournament_id),
    teamName: row.team_name != null ? String(row.team_name) : null,
    player1Id: String(row.player1_id),
    player2Id: String(row.player2_id),
    representingClubId:
      row.representing_club_id != null ? String(row.representing_club_id) : null,
    status: row.status as TournamentEntry["status"],
    seed: row.seed != null ? Number(row.seed) : null,
    createdAt: String(row.created_at),
  };
}

function mapTournamentMatch(row: TournamentMatchRow): TournamentMatch {
  return {
    id: String(row.id),
    tournamentId: String(row.tournament_id),
    round: String(row.round),
    position: Number(row.position),
    matchId: row.match_id != null ? String(row.match_id) : null,
    team1EntryId: row.team1_entry_id != null ? String(row.team1_entry_id) : null,
    team2EntryId: row.team2_entry_id != null ? String(row.team2_entry_id) : null,
    scheduledStartsAt: row.scheduled_starts_at != null ? String(row.scheduled_starts_at) : null,
    courtId: row.court_id != null ? String(row.court_id) : null,
    createdAt: String(row.created_at),
  };
}

export type TournamentWithClub = Tournament & {
  clubName: string;
  clubCity: string;
};

export type TournamentMatchWithMeta = TournamentMatch & {
  winnerTeam: "A" | "B" | null;
  setScores: { a: number; b: number }[] | null;
};

export type TournamentSummaryForProfile = {
  tournamentId: string;
  title: string;
  clubName: string;
  status: Tournament["status"];
  placementLabel: string;
};

export async function listTournamentsForClub(clubId: string): Promise<Tournament[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: hosted, error: hostedError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("club_id", clubId)
      .order("starts_at", { ascending: true, nullsFirst: false });

    if (hostedError) {
      console.warn("[tournaments.listTournamentsForClub] hosted", hostedError.message);
    }

    const { data: invitedLinks, error: invitedError } = await supabase
      .from("tournament_participating_clubs")
      .select("tournament_id")
      .eq("club_id", clubId)
      .in("status", ["pending", "accepted"]);

    if (invitedError) {
      console.warn("[tournaments.listTournamentsForClub] invited", invitedError.message);
    }

    const hostedIds = new Set((hosted ?? []).map((r) => String((r as { id: string }).id)));
    const invitedIds = (invitedLinks ?? [])
      .map((r) => String((r as { tournament_id: string }).tournament_id))
      .filter((id) => !hostedIds.has(id));

    let invitedTournaments: TournamentRow[] = [];
    if (invitedIds.length > 0) {
      const { data: invitedRows, error: invitedRowsError } = await supabase
        .from("tournaments")
        .select("*")
        .in("id", invitedIds);

      if (invitedRowsError) {
        console.warn("[tournaments.listTournamentsForClub] invited rows", invitedRowsError.message);
      } else {
        invitedTournaments = (invitedRows ?? []) as TournamentRow[];
      }
    }

    const merged = [...(hosted ?? []), ...invitedTournaments] as TournamentRow[];
    merged.sort((a, b) => {
      const aTime = a.starts_at ? new Date(String(a.starts_at)).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.starts_at ? new Date(String(b.starts_at)).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

    return merged.map((r) => mapTournament(r));
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export type ClubInviteOption = { id: string; name: string; city: string };

export async function listActiveClubsForTournamentInvite(
  excludeClubId: string,
): Promise<ClubInviteOption[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, city")
      .eq("is_active", true)
      .neq("id", excludeClubId)
      .order("name", { ascending: true });

    if (error) {
      console.warn("[tournaments.listActiveClubsForTournamentInvite]", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      name: String((row as { name: string }).name),
      city: String((row as { city?: string }).city ?? ""),
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function listParticipatingClubsForTournament(
  tournamentId: string,
): Promise<import("@/domain/rules/tournament-club-standings").TournamentParticipatingClub[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tournament_participating_clubs")
      .select("id, tournament_id, club_id, role, status, clubs(name, city)")
      .eq("tournament_id", tournamentId)
      .order("role", { ascending: true });

    if (error) {
      console.warn("[tournaments.listParticipatingClubsForTournament]", error.message);
      return [];
    }

    return (data ?? []).map((raw) => {
      const row = raw as {
        id: string;
        tournament_id: string;
        club_id: string;
        role: string;
        status: string;
        clubs?: { name?: string; city?: string } | { name?: string; city?: string }[] | null;
      };
      const club = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
      return {
        id: String(row.id),
        tournamentId: String(row.tournament_id),
        clubId: String(row.club_id),
        clubName: club?.name?.trim() || "Club",
        clubCity: club?.city?.trim() || "",
        role: row.role === "host" ? "host" : "invited",
        status:
          row.status === "accepted" || row.status === "declined" ? row.status : "pending",
      };
    });
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function clubCanAccessTournament(
  clubId: string,
  tournament: Tournament,
): Promise<"host" | "participant" | null> {
  if (tournament.clubId === clubId) {
    return "host";
  }

  const participants = await listParticipatingClubsForTournament(tournament.id);
  const link = participants.find((p) => p.clubId === clubId && p.status !== "declined");
  return link ? "participant" : null;
}

export async function isClubAcceptedParticipant(
  tournamentId: string,
  clubId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tournament_participating_clubs")
    .select("status")
    .eq("tournament_id", tournamentId)
    .eq("club_id", clubId)
    .eq("status", "accepted")
    .maybeSingle();
  return Boolean(data);
}

export async function listDiscoverableTournaments(): Promise<TournamentWithClub[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tournaments")
      .select("*, clubs(name, city)")
      .in("status", ["registration_open", "in_progress"])
      .order("starts_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.warn("[tournaments.listDiscoverableTournaments]", error.message);
      return [];
    }
    return (data ?? []).map((raw) => {
      const row = raw as TournamentRow & {
        clubs?: { name?: string; city?: string } | { name?: string; city?: string }[] | null;
      };
      const t = mapTournament(row);
      const c = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
      return {
        ...t,
        clubName: c?.name?.trim() || "Club",
        clubCity: c?.city?.trim() || "",
      };
    });
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      if (error) console.warn("[tournaments.getTournamentById]", error.message);
      return null;
    }
    return mapTournament(data as TournamentRow);
  } catch (err) {
    rethrowFrameworkError(err);
    return null;
  }
}

export async function getTournamentWithClub(
  id: string,
): Promise<(Tournament & { clubName: string; clubCity: string }) | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tournaments")
      .select("*, clubs(name, city)")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      if (error) console.warn("[tournaments.getTournamentWithClub]", error.message);
      return null;
    }
    const row = data as TournamentRow & {
      clubs?: { name?: string; city?: string } | { name?: string; city?: string }[] | null;
    };
    const c = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
    return {
      ...mapTournament(row),
      clubName: c?.name?.trim() || "Club",
      clubCity: c?.city?.trim() || "",
    };
  } catch (err) {
    rethrowFrameworkError(err);
    return null;
  }
}

export async function listEntriesForTournament(tournamentId: string): Promise<TournamentEntry[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false });

    if (error) {
      console.warn("[tournaments.listEntriesForTournament]", error.message);
      return [];
    }

    return (data ?? []).map((r) => mapEntry(r as EntryRow));
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function listTournamentMatchesWithResults(
  tournamentId: string,
): Promise<TournamentMatchWithMeta[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("position", { ascending: true });

    if (error) {
      console.warn("[tournaments.listTournamentMatchesWithResults]", error.message);
      return [];
    }

    const rows = (data ?? []) as TournamentMatchRow[];
    const matchIds = rows.map((r) => r.match_id).filter(Boolean) as string[];
    const resultsByMatch = new Map<string, { winner: "A" | "B"; sets: { a: number; b: number }[] | null }>();
    if (matchIds.length > 0) {
      const { data: resRows, error: rErr } = await supabase
        .from("match_results")
        .select("match_id, winner_team, set_scores")
        .in("match_id", matchIds);
      if (!rErr && resRows) {
        for (const r of resRows as {
          match_id: string;
          winner_team: string;
          set_scores?: unknown;
        }[]) {
          if (r.winner_team === "A" || r.winner_team === "B") {
            resultsByMatch.set(r.match_id, {
              winner: r.winner_team,
              sets: parseSetScoresJson(r.set_scores),
            });
          }
        }
      }
    }

    return rows.map((row) => {
      const m = mapTournamentMatch(row);
      const result = m.matchId ? resultsByMatch.get(m.matchId) : undefined;
      return {
        ...m,
        winnerTeam: result?.winner ?? null,
        setScores: result?.sets ?? null,
      };
    });
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function countBracketMatches(tournamentId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("tournament_matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .not("match_id", "is", null);

  if (error) return 0;
  return count ?? 0;
}

export async function playerAlreadyInTournament(
  tournamentId: string,
  player1Id: string,
  player2Id: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournament_entries")
    .select("id, player1_id, player2_id")
    .eq("tournament_id", tournamentId)
    .neq("status", "withdrawn");

  if (error || !data) return false;
  const ids = new Set<string>();
  for (const row of data as { player1_id: string; player2_id: string }[]) {
    ids.add(row.player1_id);
    ids.add(row.player2_id);
  }
  return ids.has(player1Id) || ids.has(player2Id);
}

export type ProfilePick = { id: string; display_name: string | null };

export type TournamentEntryWithNames = TournamentEntry & {
  player1Name: string;
  player2Name: string;
};

export async function listEntriesWithDisplayNames(tournamentId: string): Promise<TournamentEntryWithNames[]> {
  const entries = await listEntriesForTournament(tournamentId);
  if (entries.length === 0) return [];
  const ids = [...new Set(entries.flatMap((e) => [e.player1Id, e.player2Id]))];
  const supabase = await createSupabaseServerClient();
  const { data: profs, error } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  if (error) {
    console.warn("[tournaments.listEntriesWithDisplayNames]", error.message);
  }
  const names = new Map<string, string>();
  for (const p of profs ?? []) {
    const row = p as { id: string; display_name: string | null };
    names.set(row.id, row.display_name?.trim() || "Joueur");
  }
  return entries.map((e) => ({
    ...e,
    player1Name: names.get(e.player1Id) ?? "Joueur",
    player2Name: names.get(e.player2Id) ?? "Joueur",
  }));
}

export async function fetchProfilesForPartnerPick(
  excludeUserId: string,
  limit = 80,
): Promise<ProfilePick[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .neq("id", excludeUserId)
      .order("display_name", { ascending: true })
      .limit(limit);

    if (error) {
      console.warn("[tournaments.fetchProfilesForPartnerPick]", error.message);
      return [];
    }
    return (data ?? []) as ProfilePick[];
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

const ROUND_RANK: Record<string, number> = {
  r32: 10,
  r16: 20,
  qf: 30,
  semi: 40,
  final: 50,
};

function rankRound(r: string): number {
  return ROUND_RANK[r] ?? 15;
}

function placementFromMatches(entryId: string, matches: TournamentMatchWithMeta[]): string {
  const mine = matches.filter((m) => m.team1EntryId === entryId || m.team2EntryId === entryId);
  if (mine.length === 0) return "participant";

  const sorted = [...mine].sort((a, b) => rankRound(b.round) - rankRound(a.round));
  const deepest = sorted[0]!;
  if (!deepest.winnerTeam || !deepest.matchId) {
    return deepest.round === "final" ? "finaliste (en cours)" : `${deepest.round} (en cours)`;
  }

  const teamSide = deepest.team1EntryId === entryId ? "A" : "B";
  const won = deepest.winnerTeam === teamSide;
  if (deepest.round === "final" && won) return "champion";
  if (deepest.round === "final" && !won) return "finaliste";
  if (deepest.round === "semi" && won) return "demi-finale (qualifié)";
  if (deepest.round === "semi" && !won) return "demi-finale";
  if (!won) return `éliminé (${deepest.round})`;
  return `${deepest.round} (qualifié)`;
}

export async function fetchRecentTournamentSummariesForPlayer(
  userId: string,
  limit = 5,
): Promise<TournamentSummaryForProfile[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: entries, error: e1 } = await supabase
      .from("tournament_entries")
      .select("id, tournament_id")
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (e1 || !entries?.length) return [];

    const entryRows = entries as { id: string; tournament_id: string }[];
    const tournamentIds = [...new Set(entryRows.map((x) => x.tournament_id))];
    const { data: tournaments, error: e2 } = await supabase
      .from("tournaments")
      .select("id, title, status, clubs(name)")
      .in("id", tournamentIds);

    if (e2 || !tournaments) return [];

    type TournamentListRow = {
      id: string;
      title: string;
      status: string;
      clubs?: { name?: string } | { name?: string }[] | null;
    };

    const titleById = new Map<string, string>();
    const clubById = new Map<string, string>();
    const statusById = new Map<string, Tournament["status"]>();
    for (const t of tournaments as unknown as TournamentListRow[]) {
      const id = String(t.id);
      titleById.set(id, String(t.title));
      statusById.set(id, t.status as Tournament["status"]);
      const c = Array.isArray(t.clubs) ? t.clubs[0] : t.clubs;
      clubById.set(id, c?.name?.trim() || "Club");
    }

    const matchesByTournament = new Map<string, TournamentMatchWithMeta[]>();
    for (const tid of tournamentIds) {
      matchesByTournament.set(tid, await listTournamentMatchesWithResults(tid));
    }

    const out: TournamentSummaryForProfile[] = [];
    for (const row of entryRows) {
      const matches = matchesByTournament.get(row.tournament_id) ?? [];
      out.push({
        tournamentId: row.tournament_id,
        title: titleById.get(row.tournament_id) ?? "Tournoi",
        clubName: clubById.get(row.tournament_id) ?? "",
        status: statusById.get(row.tournament_id) ?? "draft",
        placementLabel: placementFromMatches(row.id, matches),
      });
      if (out.length >= limit) break;
    }

    return out;
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

/**
 * Creates first-round knockout matches: `matches` + `match_participants` + `tournament_matches`.
 * V1: only first round; team count must be power of 2.
 */
export async function createTournamentKnockoutFirstRound(args: {
  tournament: Tournament;
  entries: TournamentEntry[];
  staffUserId: string;
  matchGenderType?: MatchGenderType;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tournament, entries, staffUserId, matchGenderType = "all" } = args;

  const active = entries.filter((e) => e.status !== "withdrawn");
  if (!isPowerOfTwoTeamCount(active.length)) {
    return {
      ok: false,
      error: "Le nombre d’équipes inscrites doit être une puissance de 2 (4, 8, 16…).",
    };
  }

  const supabase = await createSupabaseServerClient();

  const ratings = new Map<string, number>();
  const playerIds = [...new Set(active.flatMap((e) => [e.player1Id, e.player2Id]))];
  const { data: profiles } = await supabase.from("profiles").select("id, sport_rating").in("id", playerIds);
  for (const p of profiles ?? []) {
    const row = p as { id: string; sport_rating: number | null };
    ratings.set(row.id, Number(row.sport_rating ?? 1200));
  }

  const strength = (e: TournamentEntry) =>
    (ratings.get(e.player1Id) ?? 1200) + (ratings.get(e.player2Id) ?? 1200);

  const sorted = [...active].sort((a, b) => strength(b) - strength(a));

  for (let idx = 0; idx < sorted.length; idx += 1) {
    await supabase.from("tournament_entries").update({ seed: idx + 1 }).eq("id", sorted[idx]!.id);
  }

  const teamCount = sorted.length;
  const roundLabel = knockoutRoundLabel(teamCount);
  const pairs = firstKnockoutPairingIndices(teamCount);

  const startsAt = tournament.startsAt ?? new Date().toISOString();

  for (let i = 0; i < pairs.length; i += 1) {
    const [ia, ib] = pairs[i]!;
    const e1 = sorted[ia]!;
    const e2 = sorted[ib]!;

    const { data: matchRow, error: mErr } = await supabase
      .from("matches")
      .insert({
        club_id: tournament.clubId,
        created_by: staffUserId,
        starts_at: startsAt,
        status: "open",
        match_gender_type: matchGenderType,
      })
      .select("id")
      .single();

    if (mErr || !matchRow) {
      return { ok: false, error: mErr?.message ?? "Impossible de créer le match." };
    }

    const matchId = String((matchRow as { id: string }).id);

    const { error: pErr } = await supabase.from("match_participants").insert([
      { match_id: matchId, player_id: e1.player1Id, team: "A" },
      { match_id: matchId, player_id: e1.player2Id, team: "A" },
      { match_id: matchId, player_id: e2.player1Id, team: "B" },
      { match_id: matchId, player_id: e2.player2Id, team: "B" },
    ]);

    if (pErr) {
      return { ok: false, error: pErr.message };
    }

    const { error: tmErr } = await supabase.from("tournament_matches").insert({
      tournament_id: tournament.id,
      round: roundLabel,
      position: i,
      match_id: matchId,
      team1_entry_id: e1.id,
      team2_entry_id: e2.id,
      scheduled_starts_at: startsAt,
    });

    if (tmErr) {
      return { ok: false, error: tmErr.message };
    }
  }

  return { ok: true };
}

export type TournamentSoloEntry = {
  id: string;
  tournamentId: string;
  playerId: string;
  status: TournamentEntry["status"];
  americanoPoints: number;
  representingClubId: string | null;
  createdAt: string;
};

export type TournamentSoloEntryWithName = TournamentSoloEntry & {
  playerName: string;
};

export async function listSoloEntriesForTournament(
  tournamentId: string,
): Promise<TournamentSoloEntry[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tournament_solo_entries")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("americano_points", { ascending: false });

    if (error) {
      console.warn("[tournaments.listSoloEntriesForTournament]", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      tournamentId: String((row as { tournament_id: string }).tournament_id),
      playerId: String((row as { player_id: string }).player_id),
      status: (row as { status: TournamentEntry["status"] }).status,
      americanoPoints: Number((row as { americano_points?: number }).americano_points ?? 0),
      representingClubId:
        (row as { representing_club_id?: string | null }).representing_club_id != null
          ? String((row as { representing_club_id: string }).representing_club_id)
          : null,
      createdAt: String((row as { created_at: string }).created_at),
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function listSoloEntriesWithDisplayNames(
  tournamentId: string,
): Promise<TournamentSoloEntryWithName[]> {
  const entries = await listSoloEntriesForTournament(tournamentId);
  if (entries.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const ids = entries.map((e) => e.playerId);
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      String((p as { id: string }).id),
      String((p as { display_name?: string | null }).display_name ?? "Joueur"),
    ]),
  );

  return entries.map((e) => ({
    ...e,
    playerName: nameById.get(e.playerId) ?? "Joueur",
  }));
}

export async function playerAlreadyInAmericano(
  tournamentId: string,
  playerId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tournament_solo_entries")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .neq("status", "withdrawn")
    .maybeSingle();
  return Boolean(data);
}

async function insertTournamentMatchWithPlayers(args: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  tournament: Tournament;
  staffUserId: string;
  round: string;
  position: number;
  teamAPlayerIds: [string, string];
  teamBPlayerIds: [string, string];
  team1EntryId?: string | null;
  team2EntryId?: string | null;
  startsAt: string;
  matchGenderType?: MatchGenderType;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    supabase,
    tournament,
    staffUserId,
    round,
    position,
    teamAPlayerIds,
    teamBPlayerIds,
    team1EntryId = null,
    team2EntryId = null,
    startsAt,
    matchGenderType = "all",
  } = args;

  const { data: matchRow, error: mErr } = await supabase
    .from("matches")
    .insert({
      club_id: tournament.clubId,
      created_by: staffUserId,
      starts_at: startsAt,
      status: "open",
      match_gender_type: matchGenderType,
    })
    .select("id")
    .single();

  if (mErr || !matchRow) {
    return { ok: false, error: mErr?.message ?? "Impossible de créer le match." };
  }

  const matchId = String((matchRow as { id: string }).id);

  const { error: pErr } = await supabase.from("match_participants").insert([
    { match_id: matchId, player_id: teamAPlayerIds[0], team: "A" },
    { match_id: matchId, player_id: teamAPlayerIds[1], team: "A" },
    { match_id: matchId, player_id: teamBPlayerIds[0], team: "B" },
    { match_id: matchId, player_id: teamBPlayerIds[1], team: "B" },
  ]);

  if (pErr) {
    return { ok: false, error: pErr.message };
  }

  const { error: tmErr } = await supabase.from("tournament_matches").insert({
    tournament_id: tournament.id,
    round,
    position,
    match_id: matchId,
    team1_entry_id: team1EntryId,
    team2_entry_id: team2EntryId,
    scheduled_starts_at: startsAt,
  });

  if (tmErr) {
    return { ok: false, error: tmErr.message };
  }

  return { ok: true };
}

/**
 * Poules : round-robin par groupe de 4 équipes max.
 */
export async function createTournamentPoolMatches(args: {
  tournament: Tournament;
  entries: TournamentEntry[];
  staffUserId: string;
  matchGenderType?: MatchGenderType;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tournament, entries, staffUserId, matchGenderType = "all" } = args;
  const active = entries.filter((e) => e.status !== "withdrawn");
  if (active.length < 3) {
    return { ok: false, error: "Il faut au moins 3 équipes pour des poules." };
  }

  const supabase = await createSupabaseServerClient();
  const schedule = buildPoolMatchSchedule(active.length);
  const startsAt = tournament.startsAt ?? new Date().toISOString();
  let position = 0;

  for (const slot of schedule) {
    const e1 = active[slot.teamIndexA];
    const e2 = active[slot.teamIndexB];
    if (!e1 || !e2) {
      continue;
    }

    const inserted = await insertTournamentMatchWithPlayers({
      supabase,
      tournament,
      staffUserId,
      round: poolRoundLabel(slot.poolLabel),
      position,
      teamAPlayerIds: [e1.player1Id, e1.player2Id],
      teamBPlayerIds: [e2.player1Id, e2.player2Id],
      team1EntryId: e1.id,
      team2EntryId: e2.id,
      startsAt,
      matchGenderType,
    });

    if (!inserted.ok) {
      return inserted;
    }
    position += 1;
  }

  return { ok: true };
}

/**
 * Américano : rotations solo, 4/8/12/16 joueurs.
 */
export async function createTournamentAmericanoMatches(args: {
  tournament: Tournament;
  soloEntries: TournamentSoloEntry[];
  staffUserId: string;
  matchGenderType?: MatchGenderType;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tournament, soloEntries, staffUserId, matchGenderType = "all" } = args;
  const active = soloEntries.filter((e) => e.status !== "withdrawn");
  const playerIds = active.map((e) => e.playerId);

  if (playerIds.length < 4 || playerIds.length % 4 !== 0) {
    return {
      ok: false,
      error: "L’Américano nécessite 4, 8, 12 ou 16 joueurs inscrits.",
    };
  }

  let rounds;
  try {
    rounds = buildAmericanoRotationRounds(playerIds.length);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Planning impossible." };
  }

  const supabase = await createSupabaseServerClient();
  const startsAt = tournament.startsAt ?? new Date().toISOString();
  let position = 0;

  for (const round of rounds) {
    for (let court = 0; court < round.courts.length; court += 1) {
      const courtMatch = round.courts[court]!;
      const inserted = await insertTournamentMatchWithPlayers({
        supabase,
        tournament,
        staffUserId,
        round: americanoRoundLabel(round.round),
        position,
        teamAPlayerIds: [playerIds[courtMatch.a1]!, playerIds[courtMatch.a2]!],
        teamBPlayerIds: [playerIds[courtMatch.b1]!, playerIds[courtMatch.b2]!],
        startsAt,
        matchGenderType,
      });
      if (!inserted.ok) {
        return inserted;
      }
      position += 1;
    }
  }

  return { ok: true };
}
