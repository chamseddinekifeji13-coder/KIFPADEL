/** Cookie temporaire pour la cible post-OAuth (évite ?next= dans redirect_to Supabase). */
export const AUTH_NEXT_COOKIE = "kif_auth_next";

export const AUTH_NEXT_COOKIE_MAX_AGE_SEC = 600;

export function buildAuthCallbackPath(locale: string): string {
  return `/${locale}/auth/callback`;
}
