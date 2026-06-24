import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { isUuidString } from "@/lib/uuid-utils";

/** Lien d'inscription avec code parrain (UUID joueur). */
export function buildReferralSignUpUrl(origin: string, locale: string, referrerUserId: string): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const base = origin.replace(/\/$/, "");
  const id = referrerUserId.trim();
  if (!isUuidString(id)) {
    return `${base}/${loc}/auth/sign-up`;
  }
  const params = new URLSearchParams({ ref: id });
  return `${base}/${loc}/auth/sign-up?${params.toString()}`;
}

/** Lien d'inscription générique (promotion plateforme, sans parrain). */
export function buildPlatformSignUpUrl(origin: string, locale: string): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return `${origin.replace(/\/$/, "")}/${loc}/auth/sign-up`;
}

/** Inscription club : redirige vers la création de club après connexion. */
export function buildPlatformClubSignUpUrl(origin: string, locale: string): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({ next: `/${loc}/clubs/new` });
  return `${base}/${loc}/auth/sign-up?${params.toString()}`;
}

/** Connexion club : redirige vers la création de club pour les comptes existants. */
export function buildPlatformClubSignInUrl(origin: string, locale: string): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({ next: `/${loc}/clubs/new` });
  return `${base}/${loc}/auth/sign-in?${params.toString()}`;
}

export function parseReferrerIdParam(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  return isUuidString(value) ? value : null;
}
