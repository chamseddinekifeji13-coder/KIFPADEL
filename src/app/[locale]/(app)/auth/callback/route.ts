import { NextResponse } from "next/server";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { createSupabaseOAuthRouteHandlerClient } from "@/lib/supabase/route-handler";

type CallbackRouteContext = {
  params: Promise<{ locale: string }>;
};

function getSafeNextPath(rawNext: string | null, locale: string) {
  return sanitizeAuthNextPath(rawNext, locale, `/${locale}/onboarding`);
}

export async function GET(request: Request, context: CallbackRouteContext) {
  const { locale } = await context.params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"), locale);
  const signInErrorUrl = new URL(`/${locale}/auth/sign-in?error=callback_failed`, request.url);

  if (oauthError) {
    console.error(
      "[auth/callback] OAuth provider error:",
      oauthError,
      requestUrl.searchParams.get("error_description"),
    );
    return NextResponse.redirect(signInErrorUrl);
  }

  if (!code) {
    return NextResponse.redirect(signInErrorUrl);
  }

  const successUrl = new URL(next, request.url);
  const { supabase, response } = await createSupabaseOAuthRouteHandlerClient(successUrl);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return NextResponse.redirect(signInErrorUrl);
  }

  return response;
}
