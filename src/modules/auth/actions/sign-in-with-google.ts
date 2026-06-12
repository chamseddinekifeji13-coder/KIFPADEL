"use server";

import { redirect } from "next/navigation";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { publicEnv } from "@/lib/config/env";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function signInWithGoogleAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const defaultNext = `/${locale}/onboarding`;
  const next = sanitizeAuthNextPath(formData.get("next"), locale, defaultNext);

  const supabase = await createSupabaseServerActionClient();
  const callbackUrl = new URL(`${publicEnv.siteUrl}/${locale}/auth/callback`);
  callbackUrl.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
      scopes: "email profile",
    },
  });

  if (error || !data.url) {
    console.error("[signInWithGoogleAction]", error?.message ?? "missing OAuth URL");
    redirect(`/${locale}/auth/sign-in?error=auth_config_error`);
  }

  redirect(data.url);
}
