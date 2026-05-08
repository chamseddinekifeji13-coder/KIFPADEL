import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ConfirmEmailRouteContext = {
  params: Promise<{ locale: string }>;
};

function getSafeNextPath(rawNext: string | null, locale: string) {
  const fallback = `/${locale}/onboarding`;
  const next = String(rawNext ?? "").trim();

  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;

  return next;
}

/**
 * Cible dédiée au lien « confirmez votre email » après inscription (`signUp` → emailRedirectTo).
 * On échange le code contre une session (validation du jeton avec Supabase), puis on déconnecte
 * immédiatement : l'utilisateur doit se connecter avec email + mot de passe avant d'accéder au parcours.
 */
export async function GET(request: Request, context: ConfirmEmailRouteContext) {
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
    console.error("[confirm-email] exchangeCodeForSession:", error.message);
    return NextResponse.redirect(
      new URL(`/${locale}/auth/sign-in?error=callback_failed`, request.url),
    );
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.error("[confirm-email] signOut:", signOutError.message);
  }

  const signInUrl = new URL(`/${locale}/auth/sign-in`, request.url);
  signInUrl.searchParams.set("status", "email_confirmed");
  signInUrl.searchParams.set("next", next);
  return NextResponse.redirect(signInUrl);
}
