"use server";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import {
  AUTH_NEXT_COOKIE,
  AUTH_NEXT_COOKIE_MAX_AGE_SEC,
  buildAuthCallbackPath,
} from "@/lib/auth/auth-next-cookie";
import { isGoogleAuthEnabled } from "@/lib/auth/google-auth-enabled";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { cookies } from "next/headers";

export type GoogleSignInResult =
  | { ok: true; url: string }
  | { ok: false; error: "auth_config_error" };

export async function signInWithGoogleAction(formData: FormData): Promise<GoogleSignInResult> {
  if (!isGoogleAuthEnabled()) {
    return { ok: false, error: "auth_config_error" };
  }

  const locale = String(formData.get("locale") ?? "fr");
  const defaultNext = `/${locale}/onboarding`;
  const next = sanitizeAuthNextPath(String(formData.get("next") ?? ""), locale, defaultNext);

  const origin = await resolveSiteOrigin();
  const callbackPath = buildAuthCallbackPath(locale);
  const redirectTo = new URL(callbackPath, origin).toString();

  const cookieStore = await cookies();
  cookieStore.set(AUTH_NEXT_COOKIE, next, {
    path: "/",
    maxAge: AUTH_NEXT_COOKIE_MAX_AGE_SEC,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

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
