import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type CallbackRouteContext = {
  params: Promise<{ locale: string }>;
};

function getSafeNextPath(rawNext: string | null, locale: string) {
  const fallback = `/${locale}/onboarding`;
  const next = String(rawNext ?? "").trim();

  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;

  return next;
}

export async function GET(request: Request, context: CallbackRouteContext) {
  const { locale } = await context.params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"), locale);

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/sign-in?error=callback_failed`, request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      new URL(`/${locale}/auth/sign-in?error=callback_failed`, request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
