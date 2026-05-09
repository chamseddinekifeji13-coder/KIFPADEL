"use server";

import { revalidatePath } from "next/cache";

import {
  canCreatorUseMatchGenderType,
  canJoinMatchByGenderRules,
  isValidTeamCompositionAfterJoin,
} from "@/domain/rules/match-gender";
import type { Gender, MatchGenderType } from "@/domain/types/core";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  assertNotSuspended,
  isPlayerAccessError,
} from "@/modules/compliance/player-access";

export type CreateOpenMatchResult =
  | { ok: true; matchId: string }
  | { ok: false; error: string };

export type JoinOpenMatchResult = { ok: true } | { ok: false; error: string };

const DEFAULT_PRICE_PER_PLAYER = 0;
/** Durée padel classique, pour colonne ends_at si présente. */
const MATCH_DURATION_MS = 90 * 60 * 1000;

function parseMatchGenderType(raw: string | null | undefined): MatchGenderType {
  if (raw === "men_only" || raw === "women_only" || raw === "mixed" || raw === "all") {
    return raw;
  }
  return "all";
}

/**
 * Crée un match ouvert pour l'utilisateur connecté.
 * Enregistre `match_gender_type` et ajoute le créateur en équipe A dans `match_participants`.
 */
export async function createOpenMatchAction(input: {
  locale: string;
  clubId: string;
  startsAtIso: string;
  matchGenderType: MatchGenderType;
}): Promise<CreateOpenMatchResult> {
  const { locale, clubId, startsAtIso, matchGenderType } = input;
  const loc = locale?.trim() || "fr";

  if (!clubId?.trim() || !startsAtIso?.trim()) {
    return { ok: false, error: "Données incomplètes." };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  try {
    await assertNotSuspended(supabase, user.id);
  } catch (e) {
    if (isPlayerAccessError(e)) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", user.id)
    .maybeSingle();

  const creatorGender =
    profile?.gender === "male" || profile?.gender === "female" ? profile.gender : null;

  if (!canCreatorUseMatchGenderType(creatorGender, matchGenderType)) {
    return {
      ok: false,
      error:
        "Ce type de match n'est pas compatible avec ton profil (genre requis ou incohérent).",
    };
  }

  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Date ou heure invalides." };
  }

  if (startsAt.getTime() < Date.now() - 30_000) {
    return { ok: false, error: "Choisis un créneau dans le futur." };
  }

  const endsAtIso = new Date(startsAt.getTime() + MATCH_DURATION_MS).toISOString();

  const { data: court } = await supabase
    .from("courts")
    .select("id")
    .eq("club_id", clubId)
    .limit(1)
    .maybeSingle();

  const base = {
    club_id: clubId,
    created_by: user.id,
    starts_at: startsAt.toISOString(),
    status: "open" as const,
    match_gender_type: matchGenderType,
  };

  const attempts: Record<string, unknown>[] = [
    { ...base },
    { ...base, price_per_player: DEFAULT_PRICE_PER_PLAYER },
    { ...base, ends_at: endsAtIso },
    {
      ...base,
      price_per_player: DEFAULT_PRICE_PER_PLAYER,
      ends_at: endsAtIso,
    },
  ];

  if (court?.id) {
    attempts.push(
      { ...base, court_id: court.id },
      { ...base, court_id: court.id, price_per_player: DEFAULT_PRICE_PER_PLAYER },
      { ...base, court_id: court.id, ends_at: endsAtIso },
      {
        ...base,
        court_id: court.id,
        price_per_player: DEFAULT_PRICE_PER_PLAYER,
        ends_at: endsAtIso,
      },
    );
  }

  const seen = new Set<string>();
  let lastMessage = "Impossible de créer le match.";
  let createdId: string | null = null;

  for (const payload of attempts) {
    const key = JSON.stringify(payload);
    if (seen.has(key)) continue;
    seen.add(key);

    const { data: row, error } = await supabase
      .from("matches")
      .insert(payload)
      .select("id")
      .single();

    if (!error && row?.id) {
      createdId = row.id as string;
      break;
    }

    if (error?.message) {
      lastMessage = error.message;
    }
  }

  if (!createdId) {
    const hint =
      !court?.id && /court_id|null value .*court/i.test(lastMessage)
        ? " Ce club n'a pas de terrain configuré ou tu n'y as pas accès."
        : "";
    return { ok: false, error: `${lastMessage}${hint}` };
  }

  const { error: partError } = await supabase.from("match_participants").insert({
    match_id: createdId,
    player_id: user.id,
    team: "A",
  });

  if (partError) {
    return {
      ok: false,
      error: `Match créé mais inscription sur le terrain A a échoué : ${partError.message}`,
    };
  }

  revalidatePath(`/${loc}/play-now`);
  revalidatePath(`/${loc}/matches/${createdId}`);
  return { ok: true, matchId: createdId };
}

/**
 * Rejoindre un match ouvert (équipe A ou B). Validation serveur genre + composition.
 */
export async function joinOpenMatchAction(input: {
  locale: string;
  matchId: string;
  team: "A" | "B";
}): Promise<JoinOpenMatchResult> {
  const loc = input.locale?.trim() || "fr";
  const { matchId, team } = input;

  if (!matchId?.trim() || (team !== "A" && team !== "B")) {
    return { ok: false, error: "Données invalides." };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  try {
    await assertNotSuspended(supabase, user.id);
  } catch (e) {
    if (isPlayerAccessError(e)) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", user.id)
    .maybeSingle();

  const viewerGender: Gender | null =
    profile?.gender === "male" || profile?.gender === "female" ? profile.gender : null;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, status, match_gender_type, match_participants(player_id, team)")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { ok: false, error: "Match introuvable." };
  }

  if (match.status !== "open") {
    return { ok: false, error: "Ce match n'est plus ouvert." };
  }

  const matchType = parseMatchGenderType(match.match_gender_type as string);

  if (!canJoinMatchByGenderRules(viewerGender, matchType)) {
    return {
      ok: false,
      error:
        "Tu ne peux pas rejoindre ce type de match (complète ton genre sur le profil ou choisis un autre match).",
    };
  }

  const participants = (match.match_participants ?? []) as { player_id: string; team: string }[];

  if (participants.some((p) => p.player_id === user.id)) {
    return { ok: false, error: "Tu es déjà inscrit sur ce match." };
  }

  if (participants.length >= 4) {
    return { ok: false, error: "Le match est complet." };
  }

  const teamMembers = participants.filter((p) => p.team === team);
  if (teamMembers.length >= 2) {
    return { ok: false, error: "Cette équipe est complète." };
  }

  const { data: genderRows, error: rpcError } = await supabase.rpc("match_participant_genders", {
    p_match_id: matchId,
  });

  if (rpcError) {
    return { ok: false, error: "Impossible de vérifier la composition du match." };
  }

  const genderByPlayer = new Map<string, Gender | null>();
  for (const row of (genderRows ?? []) as { player_id: string; gender: string | null }[]) {
    if (row.gender === "male" || row.gender === "female") {
      genderByPlayer.set(row.player_id, row.gender);
    } else {
      genderByPlayer.set(row.player_id, null);
    }
  }

  const existingTeamGenders = teamMembers.map((m) => genderByPlayer.get(m.player_id) ?? null);

  if (matchType !== "all" && existingTeamGenders.some((g) => g === null)) {
    return {
      ok: false,
      error:
        "Un joueur sur cette équipe n'a pas indiqué son genre : impossible de valider le match pour le moment.",
    };
  }

  if (
    !isValidTeamCompositionAfterJoin({
      existingTeamGenders,
      newPlayerGender: viewerGender,
      matchType,
    })
  ) {
    return {
      ok: false,
      error: "Impossible de rejoindre cette équipe : la composition genre ne respecte pas les règles du match.",
    };
  }

  const { error: insError } = await supabase.from("match_participants").insert({
    match_id: matchId,
    player_id: user.id,
    team,
  });

  if (insError) {
    return { ok: false, error: insError.message || "Inscription refusée." };
  }

  revalidatePath(`/${loc}/play-now`);
  revalidatePath(`/${loc}/matches/${matchId}`);
  return { ok: true };
}

/** Alias export pour les appels génériques « rejoindre un match ». */
export const joinMatchAction = joinOpenMatchAction;
