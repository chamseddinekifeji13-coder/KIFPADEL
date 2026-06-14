/**
 * Google OAuth masqué tant que les Client IDs ne sont pas configurés (Supabase + Google Cloud).
 * Réactiver : NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true + config Supabase Providers → Google.
 */
export function isGoogleAuthEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}
