"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export type SendMatchMessageOutcome =
  | { ok: true; messageId: string; createdAt: string }
  | { ok: false; error: string };

const MAX_BODY_LENGTH = 500;

export async function sendMatchMessageAction(input: {
  locale: string;
  matchId: string;
  body: string;
}): Promise<SendMatchMessageOutcome> {
  const locale = input.locale?.trim() || "fr";
  const matchId = input.matchId?.trim();
  const body = input.body?.trim() ?? "";

  if (!matchId) {
    return { ok: false, error: "Match introuvable." };
  }

  if (!body) {
    return { ok: false, error: "Message vide." };
  }

  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `Message trop long (max ${MAX_BODY_LENGTH} caractères).` };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const { data: allowed, error: accessError } = await supabase.rpc("can_access_match_chat", {
    p_match_id: matchId,
  });

  if (accessError || !allowed) {
    return { ok: false, error: "Vous n'avez pas accès à ce fil de discussion." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("match_messages")
    .insert({
      match_id: matchId,
      sender_id: user.id,
      body,
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("[sendMatchMessageAction]", insertError);
    return { ok: false, error: "Envoi impossible. Réessayez." };
  }

  revalidatePath(`/${locale}/matches/${matchId}`, "page");

  return {
    ok: true,
    messageId: String((inserted as { id: string }).id),
    createdAt: String((inserted as { created_at: string }).created_at),
  };
}
