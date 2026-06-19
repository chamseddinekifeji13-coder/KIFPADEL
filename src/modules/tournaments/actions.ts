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
  filterItemsByCategory,
  listCategoriesForSchedule,
  normalizeTournamentCategories,
  parseTournamentCategories,
  resolveRegistrationCategory,
  tournamentCategoryLabel,
  validateSoloPlayerForCategory,
  validateTeamForCategory,
  type TournamentCategory,
} from "@/domain/rules/tournament-categories";
import type { Gender } from "@/domain/types/core";
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
  listParticipatingClubsForTournament,
  isClubAcceptedParticipant,
} from "@/modules/tournaments/repository";
import { enqueueTournamentAlerts } from "@/modules/notifications/alert-outbox";
import { linkSponsorsToTournament } from "@/modules/sponsors/repository";

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

async function resolvePlayerRepresentingClubId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("main_club_id")
    .eq("id", userId)
    .maybeSingle();
  const clubId = (profile as { main_club_id?: string | null } | null)?.main_club_id;
  return clubId ? String(clubId) : null;
}

async function assertInterclubRegistrationAllowed(
  supabase: SupabaseClient,
  tournamentId: string,
  representingClubId: string | null,
): Promise<ActionResult> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) {
    return { ok: false, error: "Tournoi introuvable." };
  }
  if (tournament.tournamentScope !== "interclub") {
    return { ok: true };
  }
  if (!representingClubId) {
    return {
      ok: false,
      error: "Associe ton club principal à ton profil pour t’inscrire à ce tournoi inter-clubs.",
    };
  }
  const accepted = await isClubAcceptedParticipant(tournamentId, representingClubId);
  if (!accepted && tournament.clubId !== representingClubId) {
    return {
      ok: false,
      error: "Ton club n’est pas encore accepté sur ce tournoi inter-clubs.",
    };
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
  format?: TournamentFormat;
  interclub?: boolean;
  invitedClubIds?: string[];
  categories?: TournamentCategory[];
  sponsorIds?: string[];
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

  const interclub = input.interclub === true;
  const invitedClubIds = [...new Set((input.invitedClubIds ?? []).filter((id) => id && id !== managed.id))];
  const categories = normalizeTournamentCategories(input.categories ?? []);

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
      tournament_scope: interclub ? "interclub" : "single_club",
      scope_metadata: interclub ? { host_club_name: managed.name } : {},
      settings: categories.length > 0 ? { categories } : {},
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Création impossible." };
  }

  const tournamentId = String((row as { id: string }).id);

  if (interclub) {
    const participantRows = [
      {
        tournament_id: tournamentId,
        club_id: managed.id,
        role: "host",
        status: "accepted",
        responded_at: new Date().toISOString(),
      },
      ...invitedClubIds.map((clubId) => ({
        tournament_id: tournamentId,
        club_id: clubId,
        role: "invited",
        status: "pending",
      })),
    ];

    const { error: participantsError } = await supabase
      .from("tournament_participating_clubs")
      .insert(participantRows);

    if (participantsError) {
      await supabase.from("tournaments").delete().eq("id", tournamentId);
      return { ok: false, error: participantsError.message };
    }
  }

  const sponsorIds = [...new Set((input.sponsorIds ?? []).filter((id) => id?.trim()))];
  if (sponsorIds.length > 0) {
    try {
      await linkSponsorsToTournament(supabase, tournamentId, sponsorIds);
    } catch (err) {
      await supabase.from("tournaments").delete().eq("id", tournamentId);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Sponsors invalides.",
      };
    }
  }

  const tournamentIdFromRow = tournamentId;
  if (input.initialStatus === "registration_open") {
    void enqueueTournamentAlerts(tournamentIdFromRow);
  }
  revalidatePath(`/${loc}/club/tournaments`);
  revalidatePath(`/${loc}/club/tournaments/${tournamentIdFromRow}`);
  revalidatePath(`/${loc}/tournaments/${tournamentIdFromRow}/display`);
  return { ok: true, data: { tournamentId: tournamentIdFromRow } };
}

export async function respondTournamentClubInviteAction(input: {
  locale: string;
  tournamentId: string;
  clubId: string;
  decision: "accepted" | "declined";
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const access = await requireStaffForClub(user.id, input.clubId);
  if (!access.ok) return access;

  const { error } = await supabase
    .from("tournament_participating_clubs")
    .update({
      status: input.decision,
      responded_at: new Date().toISOString(),
    })
    .eq("tournament_id", input.tournamentId)
    .eq("club_id", input.clubId)
    .eq("role", "invited");

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${loc}/club/tournaments`);
  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  return { ok: true };
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

async function loadProfileGenders(
  supabase: SupabaseClient,
  playerIds: string[],
): Promise<Map<string, Gender | null>> {
  if (playerIds.length === 0) {
    return new Map();
  }
  const { data } = await supabase.from("profiles").select("id, gender").in("id", playerIds);
  const out = new Map<string, Gender | null>();
  for (const row of data ?? []) {
    const g = (row as { gender?: string | null }).gender;
    out.set(
      String((row as { id: string }).id),
      g === "male" || g === "female" ? g : null,
    );
  }
  return out;
}

export async function createTournamentEntryAction(input: {
  locale: string;
  tournamentId: string;
  partnerPlayerId: string;
  teamName?: string | null;
  category?: TournamentCategory;
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

  const representingClubId = await resolvePlayerRepresentingClubId(supabase, user.id);
  const interclubGuard = await assertInterclubRegistrationAllowed(
    supabase,
    input.tournamentId,
    representingClubId,
  );
  if (!interclubGuard.ok) {
    return interclubGuard;
  }

  const configured = parseTournamentCategories(tournament.settings);
  const categoryResolved = resolveRegistrationCategory(configured, input.category ?? null);
  if (!categoryResolved.ok) {
    return { ok: false, error: categoryResolved.error };
  }
  const entryCategory = categoryResolved.category;

  if (entryCategory) {
    const genders = await loadProfileGenders(supabase, [user.id, partnerId]);
    const g1 = genders.get(user.id) ?? null;
    const g2 = genders.get(partnerId) ?? null;
    if (!validateTeamForCategory(g1, g2, entryCategory)) {
      return {
        ok: false,
        error: `Cette équipe ne correspond pas à la catégorie ${tournamentCategoryLabel(entryCategory, loc)}.`,
      };
    }
  }

  const { error } = await supabase.from("tournament_entries").insert({
    tournament_id: input.tournamentId,
    player1_id: user.id,
    player2_id: partnerId,
    team_name: input.teamName?.trim() || null,
    status: "registered",
    representing_club_id: representingClubId,
    category: entryCategory,
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
  category?: TournamentCategory;
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

  const representingClubId = await resolvePlayerRepresentingClubId(supabase, user.id);
  const interclubGuard = await assertInterclubRegistrationAllowed(
    supabase,
    input.tournamentId,
    representingClubId,
  );
  if (!interclubGuard.ok) {
    return interclubGuard;
  }

  const configured = parseTournamentCategories(tournament.settings);
  const categoryResolved = resolveRegistrationCategory(configured, input.category ?? null);
  if (!categoryResolved.ok) {
    return { ok: false, error: categoryResolved.error };
  }
  const entryCategory = categoryResolved.category;

  if (entryCategory) {
    const genders = await loadProfileGenders(supabase, [user.id]);
    const gender = genders.get(user.id) ?? null;
    if (!validateSoloPlayerForCategory(gender, entryCategory)) {
      return {
        ok: false,
        error: `Tu ne peux pas t’inscrire en catégorie ${tournamentCategoryLabel(entryCategory, loc)}.`,
      };
    }
  }

  const { error } = await supabase.from("tournament_solo_entries").insert({
    tournament_id: input.tournamentId,
    player_id: user.id,
    status: "registered",
    representing_club_id: representingClubId,
    category: entryCategory,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/profile`);
  return { ok: true };
}

async function generateScheduleForCategory(
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentById>>>,
  category: TournamentCategory | null,
  entries: Awaited<ReturnType<typeof listEntriesForTournament>>,
  soloEntries: Awaited<ReturnType<typeof listSoloEntriesForTournament>>,
  staffUserId: string,
  locale: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const label = tournamentCategoryLabel(category, locale);
  const catEntries = filterItemsByCategory(
    entries.filter((e) => e.status !== "withdrawn"),
    category,
  );
  const catSolo = filterItemsByCategory(
    soloEntries.filter((e) => e.status !== "withdrawn"),
    category,
  );

  if (tournament.format === "pools") {
    if (!canGeneratePoolSchedule(catEntries.length)) {
      return {
        ok: false,
        error: `${label} : il faut au moins 3 équipes pour générer les poules.`,
      };
    }
    return createTournamentPoolMatches({
      tournament,
      entries: catEntries,
      staffUserId,
      category,
    });
  }

  if (tournament.format === "americano") {
    if (!isValidAmericanoPlayerCount(catSolo.length)) {
      return {
        ok: false,
        error: `${label} : l’Américano nécessite 4, 8, 12 ou 16 joueurs inscrits.`,
      };
    }
    return createTournamentAmericanoMatches({
      tournament,
      soloEntries: catSolo,
      staffUserId,
      category,
    });
  }

  if (!isPowerOfTwoTeamCount(catEntries.length)) {
    return {
      ok: false,
      error: `${label} : le nombre d’équipes doit être une puissance de 2 (4, 8, 16…).`,
    };
  }
  return createTournamentKnockoutFirstRound({
    tournament,
    entries: catEntries,
    staffUserId,
    category,
  });
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

  const entries = await listEntriesForTournament(input.tournamentId);
  const soloEntries = await listSoloEntriesForTournament(input.tournamentId);
  const configured = parseTournamentCategories(tournament.settings);
  const categories = listCategoriesForSchedule(configured, entries, soloEntries);

  if (categories.length === 0) {
    return { ok: false, error: "Aucune inscription pour générer le planning." };
  }

  for (const category of categories) {
    const generated = await generateScheduleForCategory(
      tournament,
      category,
      entries,
      soloEntries,
      user.id,
      loc,
    );
    if (!generated.ok) {
      return generated;
    }
  }

  const { error: uErr } = await supabase
    .from("tournaments")
    .update({ status: "in_progress" })
    .eq("id", input.tournamentId);

  if (uErr) return { ok: false, error: uErr.message };

  revalidatePath(`/${loc}/club/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/tournaments/${input.tournamentId}`);
  revalidatePath(`/${loc}/tournaments/${input.tournamentId}/display`);
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
