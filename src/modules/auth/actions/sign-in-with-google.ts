"use server";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { buildAuthCallbackUrl, resolveSiteOrigin } from "@/lib/auth/site-origin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export type GoogleSignInResult =
  | { ok: true; url: string }
  | { ok: false; error: "auth_config_error" };

export async function signInWithGoogleAction(formData: FormData): Promise<GoogleSignInResult> {
  const locale = String(formData.get("locale") ?? "fr");
  const defaultNext = `/${locale}/onboarding`;
  const next = sanitizeAuthNextPath(String(formData.get("next") ?? ""), locale, defaultNext);

  const origin = await resolveSiteOrigin();
  const redirectTo = buildAuthCallbackUrl(origin, locale, next);

  const supabase = await createSupabaseServerActionClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    console.error("[signInWithGoogleAction]", error?.message ?? "missing OAuth URL", { redirectTo });
    return { ok: false, error: "auth_config_error" };
  }

  return { ok: true, url: data.url };
}
