import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { AUTH_NEXT_COOKIE } from "@/lib/auth/auth-next-cookie";
import { REFERRAL_COOKIE } from "@/lib/auth/referral-cookie";
import { createSupabaseOAuthRouteHandlerClient } from "@/lib/supabase/route-handler";
import { applyReferrerToProfile } from "@/modules/referrals/apply-referrer";

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

  const cookieStore = await cookies();
  const nextFromCookie = cookieStore.get(AUTH_NEXT_COOKIE)?.value;
  if (nextFromCookie) {
    cookieStore.delete(AUTH_NEXT_COOKIE);
  }
  const referralFromCookie = cookieStore.get(REFERRAL_COOKIE)?.value;
  if (referralFromCookie) {
    cookieStore.delete(REFERRAL_COOKIE);
  }

  const next = getSafeNextPath(nextFromCookie ?? requestUrl.searchParams.get("next"), locale);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && referralFromCookie) {
    await applyReferrerToProfile(user.id, referralFromCookie);
  }

  return response;
}
