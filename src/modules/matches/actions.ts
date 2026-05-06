"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export type CreateOpenMatchResult =
  | { ok: true; matchId: string }
  | { ok: false; error: string };

const DEFAULT_PRICE_PER_PLAYER = 0;
/** Durée padel classique, pour colonne ends_at si présente. */
const MATCH_DURATION_MS = 90 * 60 * 1000;

/**
 * Crée un match ouvert pour l'utilisateur connecté.
 * Plusieurs formes d'insert sont essayées (du minimal au complet) pour coller
 * à l'init SQL du dépôt ou à une base enrichie (court_id, price, ends_at).
 */
export async function createOpenMatchAction(input: {
  locale: string;
  clubId: string;
  startsAtIso: string;
}): Promise<CreateOpenMatchResult> {
  const { locale, clubId, startsAtIso } = input;
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
      revalidatePath(`/${loc}/play-now`);
      return { ok: true, matchId: row.id as string };
    }

    if (error?.message) {
      lastMessage = error.message;
    }
  }

  const hint =
    !court?.id && /court_id|null value .*court/i.test(lastMessage)
      ? " Ce club n'a pas de terrain configuré ou tu n'y as pas accès."
      : "";

  return { ok: false, error: `${lastMessage}${hint}` };
}
