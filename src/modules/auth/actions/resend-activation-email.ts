"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { publicEnv } from "@/lib/config/env";

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

  const supabase = await createSupabaseServerActionClient();
  const onboardingPath = `/${locale}/onboarding`;
  const emailRedirectTo = `${publicEnv.siteUrl}/${locale}/auth/confirm-email?next=${encodeURIComponent(onboardingPath)}`;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    console.error("[resendActivationEmailAction]", error.message);
    return { ok: false, error: "Impossible de renvoyer l'e-mail. Réessayez dans quelques minutes." };
  }

  return { ok: true };
}
