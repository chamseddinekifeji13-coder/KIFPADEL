"use server";

import { revalidatePath } from "next/cache";

import { defaultDivisionTemplates } from "@/domain/rules/championship-standings";
import {
  computeChampionshipStandings,
  computePromotionRelegationMovements,
} from "@/domain/rules/championship-standings";
import type { ChampionshipStatus } from "@/domain/types/championships";
import { formatChampionshipEntryLabel } from "@/domain/types/championships";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { clubService } from "@/modules/clubs/service";
import {
  getChampionshipById,
  listDivisionsForLeague,
  listEntriesForLeague,
  listResultsForLeague,
} from "@/modules/championships/repository";

export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireManagedClub(userId: string): Promise<{ ok: true; clubId: string } | { ok: false; error: string }> {
  const managed = await clubService.getManagedClub(userId);
  if (!managed) {
    return { ok: false, error: "Aucun club géré." };
  }
  return { ok: true, clubId: managed.id };
}

function revalidateChampionshipPaths(locale: string, leagueId: string) {
  revalidatePath(`/${locale}/club/leagues`, "page");
  revalidatePath(`/${locale}/club/leagues/${leagueId}`, "page");
  revalidatePath(`/${locale}/leagues`, "page");
  revalidatePath(`/${locale}/leagues/${leagueId}`, "page");
}

export async function createChampionshipAction(input: {
  locale: string;
  title: string;
  description?: string | null;
  seasonLabel: string;
  openNow?: boolean;
  divisionCount?: 2 | 3;
}): Promise<ActionResult<{ leagueId: string }>> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const club = await requireManagedClub(user.id);
  if (!club.ok) {
    return club;
  }

  const title = input.title?.trim();
  const seasonLabel = input.seasonLabel?.trim();
  if (!title) {
    return { ok: false, error: "Titre requis." };
  }
  if (!seasonLabel) {
    return { ok: false, error: "Libellé de saison requis (ex. 2026-S1)." };
  }

  const status: ChampionshipStatus = input.openNow ? "registration_open" : "draft";
  const divisionCount = input.divisionCount === 2 ? 2 : 3;

  const { data: league, error } = await supabase
    .from("competitive_leagues")
    .insert({
      club_id: club.clubId,
      created_by: user.id,
      title,
      description: input.description?.trim() || null,
      season_label: seasonLabel,
      status,
    })
    .select("id")
    .single();

  if (error || !league) {
    return { ok: false, error: error?.message ?? "Création impossible." };
  }

  const leagueId = String((league as { id: string }).id);
  const templates =
    divisionCount === 2
      ? [
          { name: "Division 1", levelOrder: 1, promotionSlots: 0, relegationSlots: 2 },
          { name: "Division 2", levelOrder: 2, promotionSlots: 2, relegationSlots: 0 },
        ]
      : defaultDivisionTemplates();

  const { error: divError } = await supabase.from("league_divisions").insert(
    templates.map((template) => ({
      league_id: leagueId,
      name: template.name,
      level_order: template.levelOrder,
      promotion_slots: template.promotionSlots,
      relegation_slots: template.relegationSlots,
    })),
  );

  if (divError) {
    return { ok: false, error: divError.message };
  }

  revalidateChampionshipPaths(loc, leagueId);
  return { ok: true, data: { leagueId } };
}

export async function updateChampionshipStatusAction(input: {
  locale: string;
  leagueId: string;
  status: ChampionshipStatus;
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const league = await getChampionshipById(input.leagueId);
  if (!league) {
    return { ok: false, error: "Championnat introuvable." };
  }

  const club = await requireManagedClub(user.id);
  if (!club.ok || club.clubId !== league.clubId) {
    return { ok: false, error: "Accès club refusé." };
  }

  const { error } = await supabase
    .from("competitive_leagues")
    .update({ status: input.status })
    .eq("id", input.leagueId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateChampionshipPaths(loc, input.leagueId);
  return { ok: true };
}

export async function registerChampionshipEntryAction(input: {
  locale: string;
  leagueId: string;
  divisionId: string;
  partnerPlayerId: string;
  teamName?: string | null;
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const partnerId = input.partnerPlayerId?.trim();
  if (!partnerId || partnerId === user.id) {
    return { ok: false, error: "Choisis un partenaire valide." };
  }

  const league = await getChampionshipById(input.leagueId);
  if (!league || league.status !== "registration_open") {
    return { ok: false, error: "Les inscriptions ne sont pas ouvertes." };
  }

  const divisions = await listDivisionsForLeague(input.leagueId);
  if (!divisions.some((d) => d.id === input.divisionId)) {
    return { ok: false, error: "Division invalide." };
  }

  const { data: existing } = await supabase
    .from("league_entries")
    .select("id")
    .eq("league_id", input.leagueId)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id},player1_id.eq.${partnerId},player2_id.eq.${partnerId}`)
    .neq("status", "withdrawn")
    .limit(1);

  if (existing?.length) {
    return { ok: false, error: "Toi ou ton partenaire êtes déjà inscrits." };
  }

  const { error } = await supabase.from("league_entries").insert({
    league_id: input.leagueId,
    division_id: input.divisionId,
    team_name: input.teamName?.trim() || null,
    player1_id: user.id,
    player2_id: partnerId,
    status: "registered",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateChampionshipPaths(loc, input.leagueId);
  return { ok: true };
}

export async function recordChampionshipResultAction(input: {
  locale: string;
  leagueId: string;
  divisionId: string;
  homeEntryId: string;
  awayEntryId: string;
  homeSetsWon: number;
  awaySetsWon: number;
}): Promise<ActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const league = await getChampionshipById(input.leagueId);
  if (!league || league.status !== "active") {
    return { ok: false, error: "Le championnat n'est pas en cours." };
  }

  const club = await requireManagedClub(user.id);
  if (!club.ok || club.clubId !== league.clubId) {
    return { ok: false, error: "Accès club refusé." };
  }

  if (input.homeEntryId === input.awayEntryId) {
    return { ok: false, error: "Les deux équipes doivent être différentes." };
  }

  const homeSets = Number(input.homeSetsWon);
  const awaySets = Number(input.awaySetsWon);
  if (!Number.isFinite(homeSets) || !Number.isFinite(awaySets) || homeSets < 0 || awaySets < 0) {
    return { ok: false, error: "Score de sets invalide." };
  }
  if (homeSets === awaySets) {
    return { ok: false, error: "Il doit y avoir un vainqueur (sets différents)." };
  }

  const winnerEntryId = homeSets > awaySets ? input.homeEntryId : input.awayEntryId;

  const { error } = await supabase.from("league_results").insert({
    league_id: input.leagueId,
    division_id: input.divisionId,
    home_entry_id: input.homeEntryId,
    away_entry_id: input.awayEntryId,
    home_sets_won: homeSets,
    away_sets_won: awaySets,
    winner_entry_id: winnerEntryId,
    recorded_by: user.id,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateChampionshipPaths(loc, input.leagueId);
  return { ok: true };
}

export async function applyPromotionRelegationAction(input: {
  locale: string;
  leagueId: string;
}): Promise<ActionResult<{ movements: number }>> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const league = await getChampionshipById(input.leagueId);
  if (!league) {
    return { ok: false, error: "Championnat introuvable." };
  }

  const club = await requireManagedClub(user.id);
  if (!club.ok || club.clubId !== league.clubId) {
    return { ok: false, error: "Accès club refusé." };
  }

  if (league.status !== "active") {
    return { ok: false, error: "Clôturez une saison active uniquement." };
  }

  const divisions = await listDivisionsForLeague(input.leagueId);
  const entries = await listEntriesForLeague(input.leagueId);
  const results = await listResultsForLeague(input.leagueId);

  const standingsByDivision = new Map<string, ReturnType<typeof computeChampionshipStandings>>();
  for (const division of divisions) {
    const divisionEntries = entries
      .filter((e) => e.divisionId === division.id)
      .map((e) => ({ id: e.id, label: formatChampionshipEntryLabel(e) }));
    const divisionResults = results
      .filter((r) => r.divisionId === division.id)
      .map((r) => ({
        homeEntryId: r.homeEntryId,
        awayEntryId: r.awayEntryId,
        homeSetsWon: r.homeSetsWon,
        awaySetsWon: r.awaySetsWon,
        winnerEntryId: r.winnerEntryId,
      }));
    standingsByDivision.set(
      division.id,
      computeChampionshipStandings(
        divisionEntries,
        divisionResults,
        league.pointsPerWin,
        league.pointsPerLoss,
      ),
    );
  }

  const movements = computePromotionRelegationMovements(divisions, standingsByDivision);
  const changing = movements.filter((m) => m.movement !== "stayed" && m.fromDivisionId !== m.toDivisionId);

  for (const movement of changing) {
    const { error: updateError } = await supabase
      .from("league_entries")
      .update({ division_id: movement.toDivisionId, status: "active" })
      .eq("id", movement.entryId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    const { error: insertError } = await supabase.from("league_movements").insert({
      league_id: input.leagueId,
      entry_id: movement.entryId,
      from_division_id: movement.fromDivisionId,
      to_division_id: movement.toDivisionId,
      movement: movement.movement,
      season_label: league.seasonLabel,
    });

    if (insertError) {
      return { ok: false, error: insertError.message };
    }
  }

  const { error: statusError } = await supabase
    .from("competitive_leagues")
    .update({ status: "completed" })
    .eq("id", input.leagueId);

  if (statusError) {
    return { ok: false, error: statusError.message };
  }

  revalidateChampionshipPaths(loc, input.leagueId);
  return { ok: true, data: { movements: changing.length } };
}
