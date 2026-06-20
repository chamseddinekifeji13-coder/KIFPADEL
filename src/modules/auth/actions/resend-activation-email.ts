"use server";

import { sendActivationEmailViaResend } from "@/modules/auth/send-activation-email";

export type ResendActivationResult = { ok: true } | { ok: false; error: string };

export async function resendActivationEmailAction(input: {
  locale: string;
  email: string;
}): Promise<ResendActivationResult> {
  const email = input.email?.trim().toLowerCase();
  const locale = input.locale?.trim() || "fr";

  if (!email) {
    return { ok: false, error: "Adresse e-mail requise." };
  }

  const result = await sendActivationEmailViaResend({ email, locale });
  if (!result.ok) {
    return {
      ok: false,
      error: "Impossible de renvoyer l'e-mail. Réessayez dans quelques minutes.",
    };
  }

  return { ok: true };
}
