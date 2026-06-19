"use server";

import { revalidatePath } from "next/cache";

import {
  parseSetScorePair,
  validateMatchSetScores,
  type SetScore,
} from "@/domain/rules/match-score";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { assertClubStaffCanManage } from "@/modules/clubs/actions/club-staff-guard";
import { applyAmericanoPointsForMatch } from "@/modules/tournaments/americano-scoring";

export type RecordMatchResultInput = {
  locale: string;
  matchId: string;
  sets: SetScore[];
  tournamentId?: string;
};

export type RecordMatchResultOutcome = { ok: true } | { ok: false; error: string };

async function userCanRecordMatchResult(
  supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>>,
  matchId: string,
  userId: string,
  clubId: string | null,
  createdBy: string | null,
): Promise<boolean> {
  if (createdBy === userId) {
    return true;
  }

  if (clubId) {
    const staff = await assertClubStaffCanManage(supabase, clubId, userId);
    if (staff.ok) {
      return true;
    }
  }

  const { data: participant } = await supabase
    .from("match_participants")
    .select("player_id")
    .eq("match_id", matchId)
    .eq("player_id", userId)
    .in("status", ["confirmed", "completed", "pending"])
    .maybeSingle();

  return Boolean(participant);
}

export async function recordMatchResultAction(
  input: RecordMatchResultInput,
): Promise<RecordMatchResultOutcome> {
  const locale = input.locale?.trim() || "fr";
  const matchId = input.matchId?.trim();

  if (!matchId) {
    return { ok: false, error: "Match introuvable." };
  }

  const sets = input.sets
    .map((set) => parseSetScorePair(set.a, set.b))
    .filter((set): set is SetScore => set !== null);

  const validation = validateMatchSetScores(sets);
  if (!validation.ok) {
    return validation;
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, club_id, created_by, status")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { ok: false, error: "Match introuvable." };
  }

  const clubId = (match as { club_id?: string | null }).club_id ?? null;
  const createdBy = (match as { created_by?: string | null }).created_by ?? null;

  const allowed = await userCanRecordMatchResult(supabase, matchId, user.id, clubId, createdBy);
  if (!allowed) {
    return { ok: false, error: "Vous n’avez pas le droit d’enregistrer ce résultat." };
  }

  const { data: existingResult } = await supabase
    .from("match_results")
    .select("match_id")
    .eq("match_id", matchId)
    .maybeSingle();

  if (existingResult) {
    return { ok: false, error: "Le résultat de ce match est déjà enregistré." };
  }

  const { error: insertError } = await supabase.from("match_results").insert({
    match_id: matchId,
    winner_team: validation.winnerTeam,
    set_scores: sets,
    validated_by: user.id,
  });

  if (insertError) {
    console.error("[recordMatchResultAction] insert failed", insertError);
    return { ok: false, error: insertError.message || "Enregistrement impossible." };
  }

  await supabase.from("matches").update({ status: "played" }).eq("id", matchId);

  try {
    await applyAmericanoPointsForMatch(matchId, sets);
  } catch (err) {
    console.error("[recordMatchResultAction] americano points failed", err);
  }

  revalidatePath(`/${locale}/matches/${matchId}`, "page");
  revalidatePath(`/${locale}/play-now`, "page");
  revalidatePath(`/${locale}/profile`, "page");

  if (input.tournamentId) {
    revalidatePath(`/${locale}/club/tournaments/${input.tournamentId}`, "page");
    revalidatePath(`/${locale}/tournaments/${input.tournamentId}`, "page");
  }

  if (clubId) {
    revalidatePath(`/${locale}/club/tournaments`, "page");
  }

  return { ok: true };
}
