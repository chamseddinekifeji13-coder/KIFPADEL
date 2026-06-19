"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  assertNotSuspended,
  isPlayerAccessError,
} from "@/modules/compliance/player-access";
import { clubService } from "@/modules/clubs/service";
import { getSuperAdminActor } from "@/modules/admin/actor";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TournamentStatus, TournamentFormat } from "@/domain/types/tournaments";
import { isPowerOfTwoTeamCount } from "@/domain/rules/tournament-bracket";
import { canGeneratePoolSchedule } from "@/domain/rules/tournament-pools";
import { isValidAmericanoPlayerCount } from "@/domain/rules/tournament-americano";
import {
  countBracketMatches,
  createTournamentAmericanoMatches,
  createTournamentKnockoutFirstRound,
  createTournamentPoolMatches,
  getTournamentById,
  listEntriesForTournament,
  listSoloEntriesForTournament,
  playerAlreadyInTournament,
  playerAlreadyInAmericano,
} from "@/modules/tournaments/repository";
import { enqueueTournamentAlerts } from "@/modules/notifications/alert-outbox";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireStaffForClub(userId: string, clubId: string): Promise<ActionResult> {
  const managed = await clubService.getManagedClub(userId);
  if (!managed || managed.id !== clubId) {
    return { ok: false, error: "Accès club refusé." };
  }
  return { ok: true };
}

async function requireStaffForClubOrSuperAdmin(
  supabase: SupabaseClient,
  userId: string,
  clubId: string,
): Promise<ActionResult> {
  const staff = await requireStaffForClub(userId, clubId);
  if (staff.ok) return staff;
  const actor = await getSuperAdminActor(supabase);
  if (actor) return { ok: true };
  return { ok: false, error: "Accès club refusé." };
}

export async function createTournamentAction(input: {
  locale: string;
  title: string;
  description?: string | null;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
  entryFeeCents?: number | null;
  initialStatus: "draft" | "registration_open";
  format?: TournamentFormat;
}): Promise<ActionResult<{ tournamentId: string }>> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const managed = await clubService.getManagedClub(user.id);
  if (!managed) return { ok: false, error: "Aucun club géré." };

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Titre requis." };

  const format: TournamentFormat =
    input.format === "pools" || input.format === "americano" || input.format === "knockout"
      ? input.format
      : "knockout";

  const { data: row, error } = await supabase
    .from("tournaments")
    .insert({
      club_id: managed.id,
      created_by: user.id,
      title,
      description: input.description?.trim() || null,
      starts_at: input.startsAtIso || null,
      ends_at: input.endsAtIso || null,
      entry_fee_cents: input.entryFeeCents ?? null,
      status: input.initialStatus,
      format,
      tournament_scope: "single_club",
      scope_metadata: {},
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Création impossible." };
  }

  const tournamentId = String((row as { id: string }).id);
  if (input.initialStatus === "registration_open") {
    void enqueueTournamentAlerts(tournamentId);
  }
  revalidatePath(`/${loc}/club/tournaments`);
  revalidatePath(`/${loc}/club/tournaments/${tournamentId}`);
  return { ok: true, data: { tournamentId } };
}

export async function updateTournamentStatusAction(input: {
  locale: string;
  tournamentId: string;
  status: TournamentStatus;
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const tournament = await getTournamentById(input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournoi introuvable." };

  const access = await requireStaffForClubOrSuperAdmin(supabase, user.id, tournament.clubId);
  if (!access.ok) return access;

  const { error } = await supabase
    .from("tournaments")
    .update({ status: input.status })
    .eq("id", input.tournamentId);

  if (error) return { ok: false, error: error.message };

  if (input.status === "registration_open") {
    void enqueueTournamentAlerts(input.tournamentId);
  }

  revalidatePath(`/${loc}/club/tournaments`);
  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/tournaments`);
  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  return { ok: true };
}

export async function createTournamentEntryAction(input: {
  locale: string;
  tournamentId: string;
  partnerPlayerId: string;
  teamName?: string | null;
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  try {
    await assertNotSuspended(supabase, user.id);
  } catch (e) {
    if (isPlayerAccessError(e)) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const tournament = await getTournamentById(input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournoi introuvable." };
  if (tournament.format === "americano") {
    return { ok: false, error: "Inscription solo requise pour un tournoi Américano." };
  }
  if (tournament.status !== "registration_open") {
    return { ok: false, error: "Les inscriptions ne sont pas ouvertes." };
  }

  const partnerId = input.partnerPlayerId?.trim();
  if (!partnerId || partnerId === user.id) {
    return { ok: false, error: "Choisis un partenaire valide." };
  }

  const dup = await playerAlreadyInTournament(input.tournamentId, user.id, partnerId);
  if (dup) {
    return { ok: false, error: "Toi ou ton partenaire êtes déjà inscrit sur ce tournoi." };
  }

  const { error } = await supabase.from("tournament_entries").insert({
    tournament_id: input.tournamentId,
    player1_id: user.id,
    player2_id: partnerId,
    team_name: input.teamName?.trim() || null,
    status: "registered",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/profile`);
  return { ok: true };
}

export async function createTournamentSoloEntryAction(input: {
  locale: string;
  tournamentId: string;
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  try {
    await assertNotSuspended(supabase, user.id);
  } catch (e) {
    if (isPlayerAccessError(e)) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const tournament = await getTournamentById(input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournoi introuvable." };
  if (tournament.format !== "americano") {
    return { ok: false, error: "Ce tournoi n’est pas au format Américano." };
  }
  if (tournament.status !== "registration_open") {
    return { ok: false, error: "Les inscriptions ne sont pas ouvertes." };
  }

  const dup = await playerAlreadyInAmericano(input.tournamentId, user.id);
  if (dup) {
    return { ok: false, error: "Tu es déjà inscrit sur ce tournoi." };
  }

  const { error } = await supabase.from("tournament_solo_entries").insert({
    tournament_id: input.tournamentId,
    player_id: user.id,
    status: "registered",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/profile`);
  return { ok: true };
}

export async function generateTournamentScheduleAction(input: {
  locale: string;
  tournamentId: string;
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const tournament = await getTournamentById(input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournoi introuvable." };

  const access = await requireStaffForClubOrSuperAdmin(supabase, user.id, tournament.clubId);
  if (!access.ok) return access;

  if (tournament.status !== "registration_open") {
    return { ok: false, error: "Le planning ne peut être généré qu’en phase d’inscriptions ouvertes." };
  }

  const existing = await countBracketMatches(input.tournamentId);
  if (existing > 0) {
    return { ok: false, error: "Un planning existe déjà pour ce tournoi." };
  }

  let generated: { ok: true } | { ok: false; error: string };

  if (tournament.format === "pools") {
    const entries = await listEntriesForTournament(input.tournamentId);
    const activeCount = entries.filter((e) => e.status !== "withdrawn").length;
    if (!canGeneratePoolSchedule(activeCount)) {
      return { ok: false, error: "Il faut au moins 3 équipes pour générer les poules." };
    }
    generated = await createTournamentPoolMatches({
      tournament,
      entries,
      staffUserId: user.id,
    });
  } else if (tournament.format === "americano") {
    const soloEntries = await listSoloEntriesForTournament(input.tournamentId);
    const activeCount = soloEntries.filter((e) => e.status !== "withdrawn").length;
    if (!isValidAmericanoPlayerCount(activeCount)) {
      return {
        ok: false,
        error: "L’Américano nécessite 4, 8, 12 ou 16 joueurs inscrits.",
      };
    }
    generated = await createTournamentAmericanoMatches({
      tournament,
      soloEntries,
      staffUserId: user.id,
    });
  } else {
    const entries = await listEntriesForTournament(input.tournamentId);
    const activeCount = entries.filter((e) => e.status !== "withdrawn").length;
    if (!isPowerOfTwoTeamCount(activeCount)) {
      return {
        ok: false,
        error: "Le nombre d’équipes inscrites doit être une puissance de 2 (4, 8, 16…).",
      };
    }
    generated = await createTournamentKnockoutFirstRound({
      tournament,
      entries,
      staffUserId: user.id,
    });
  }

  if (!generated.ok) return { ok: false, error: generated.error };

  const { error: uErr } = await supabase
    .from("tournaments")
    .update({ status: "in_progress" })
    .eq("id", input.tournamentId);

  if (uErr) return { ok: false, error: uErr.message };

  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/club/tournaments`);
  revalidatePath(`/${loc}/tournaments`);
  return { ok: true };
}

export async function generateKnockoutBracketAction(input: {
  locale: string;
  tournamentId: string;
}): Promise<ActionResult> {
  return generateTournamentScheduleAction(input);
}

export async function setTournamentMatchWinnerAction(input: {
  locale: string;
  tournamentId: string;
  matchId: string;
  winnerTeam: "A" | "B";
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const tournament = await getTournamentById(input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournoi introuvable." };

  const access = await requireStaffForClubOrSuperAdmin(supabase, user.id, tournament.clubId);
  if (!access.ok) return access;

  const { data: tm, error: tmErr } = await supabase
    .from("tournament_matches")
    .select("id, match_id")
    .eq("tournament_id", input.tournamentId)
    .eq("match_id", input.matchId)
    .maybeSingle();

  if (tmErr || !tm || String((tm as { match_id: string }).match_id) !== input.matchId) {
    return { ok: false, error: "Ce match n’appartient pas à ce tournoi." };
  }

  const { data: existingResult } = await supabase
    .from("match_results")
    .select("match_id")
    .eq("match_id", input.matchId)
    .maybeSingle();

  if (existingResult) {
    return { ok: false, error: "Le résultat de ce match est déjà enregistré." };
  }

  const { error: insErr } = await supabase.from("match_results").insert({
    match_id: input.matchId,
    winner_team: input.winnerTeam,
    validated_by: user.id,
  });

  if (insErr) return { ok: false, error: insErr.message };

  await supabase.from("matches").update({ status: "played" }).eq("id", input.matchId);

  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/profile`);
  return { ok: true };
}
