import type { SupabaseClient } from "@supabase/supabase-js";

import type { SendMatchMessageOutcome } from "@/modules/matches/actions/send-match-message";

const MAX_BODY_LENGTH = 500;

export async function sendMatchMessage(
  supabase: SupabaseClient,
  userId: string,
  input: { matchId: string; body: string },
): Promise<SendMatchMessageOutcome> {
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

  const { data: allowed, error: accessError } = await supabase.rpc("can_access_match_chat", {
    p_match_id: matchId,
  });

  if (accessError || !allowed) {
    return { ok: false, error: "Vous n'avez pas accès à ce fil de discussion." };
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { ok: false, error: "Match introuvable." };
  }

  const status = String((match as { status?: string }).status ?? "");
  if (status !== "open" && status !== "locked") {
    return { ok: false, error: "La discussion est fermée pour ce match." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("match_messages")
    .insert({
      match_id: matchId,
      sender_id: userId,
      body,
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("[sendMatchMessage]", insertError);
    return { ok: false, error: "Envoi impossible. Réessayez." };
  }

  return {
    ok: true,
    messageId: String((inserted as { id: string }).id),
    createdAt: String((inserted as { created_at: string }).created_at),
  };
}
