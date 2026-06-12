import { NextResponse } from "next/server";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { createSupabaseOAuthRouteHandlerClient } from "@/lib/supabase/route-handler";

type ConfirmEmailRouteContext = {
  params: Promise<{ locale: string }>;
};

function getSafeNextPath(rawNext: string | null, locale: string) {
  return sanitizeAuthNextPath(rawNext, locale, `/${locale}/onboarding`);
}

/**
 * Cible dédiée au lien « confirmez votre email » après inscription (`signUp` → emailRedirectTo).
 */
export async function GET(request: Request, context: ConfirmEmailRouteContext) {
  const { locale } = await context.params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"), locale);
  const signInErrorUrl = new URL(`/${locale}/auth/sign-in?error=callback_failed`, request.url);

  if (!code) {
    return NextResponse.redirect(signInErrorUrl);
  }

  const signInUrl = new URL(`/${locale}/auth/sign-in`, request.url);
  signInUrl.searchParams.set("status", "email_confirmed");
  signInUrl.searchParams.set("next", next);

  const { supabase, response } = await createSupabaseOAuthRouteHandlerClient(signInUrl);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[confirm-email] exchangeCodeForSession:", error.message);
    return NextResponse.redirect(signInErrorUrl);
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.error("[confirm-email] signOut:", signOutError.message);
  }

  return response;
}
