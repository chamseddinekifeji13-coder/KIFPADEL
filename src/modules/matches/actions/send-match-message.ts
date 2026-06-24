"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { sendMatchMessage } from "@/modules/matches/send-match-message-service";

export type SendMatchMessageOutcome =
  | { ok: true; messageId: string; createdAt: string }
  | { ok: false; error: string };

export async function sendMatchMessageAction(input: {
  locale: string;
  matchId: string;
  body: string;
}): Promise<SendMatchMessageOutcome> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  return sendMatchMessage(supabase, user.id, {
    matchId: input.matchId,
    body: input.body,
  });
}
