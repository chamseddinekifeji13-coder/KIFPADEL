"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { clubService } from "@/modules/clubs/service";
import type { TournamentStatus } from "@/domain/types/tournaments";
import {
  countBracketMatches,
  createTournamentKnockoutFirstRound,
  getTournamentById,
  listEntriesForTournament,
  playerAlreadyInTournament,
} from "@/modules/tournaments/repository";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireStaffForClub(userId: string, clubId: string): Promise<ActionResult> {
  const managed = await clubService.getManagedClub(userId);
  if (!managed || managed.id !== clubId) {
    return { ok: false, error: "Accès club refusé." };
  }
  return { ok: true };
}

export async function createTournamentAction(input: {
  locale: string;
  title: string;
  description?: string | null;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
  entryFeeCents?: number | null;
  initialStatus: "draft" | "registration_open";
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
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Création impossible." };
  }

  const tournamentId = String((row as { id: string }).id);
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

  const access = await requireStaffForClub(user.id, tournament.clubId);
  if (!access.ok) return access;

  const { error } = await supabase
    .from("tournaments")
    .update({ status: input.status })
    .eq("id", input.tournamentId);

  if (error) return { ok: false, error: error.message };

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

  const tournament = await getTournamentById(input.tournamentId);
  if (!tournament) return { ok: false, error: "Tournoi introuvable." };
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

export async function generateKnockoutBracketAction(input: {
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

  const access = await requireStaffForClub(user.id, tournament.clubId);
  if (!access.ok) return access;

  if (tournament.status !== "registration_open") {
    return { ok: false, error: "Le tableau ne peut être généré qu’en phase d’inscriptions ouvertes." };
  }

  const existing = await countBracketMatches(input.tournamentId);
  if (existing > 0) {
    return { ok: false, error: "Un tableau existe déjà pour ce tournoi." };
  }

  const entries = await listEntriesForTournament(input.tournamentId);
  const bracket = await createTournamentKnockoutFirstRound({
    tournament,
    entries,
    staffUserId: user.id,
    matchGenderType: "all",
  });

  if (!bracket.ok) return { ok: false, error: bracket.error };

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

  const access = await requireStaffForClub(user.id, tournament.clubId);
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
