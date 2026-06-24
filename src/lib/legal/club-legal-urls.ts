import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

function localePath(locale: string, segment: string): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return `/${loc}/legal/${segment}`;
}

export function buildClubCharterPath(locale: string): string {
  return localePath(locale, "charte-club");
}

export function buildClubPrivacyPath(locale: string): string {
  return localePath(locale, "confidentialite-club");
}

export function buildClubCharterUrl(origin: string, locale: string): string {
  return `${origin.replace(/\/$/, "")}${buildClubCharterPath(locale)}`;
}

export function buildClubPrivacyUrl(origin: string, locale: string): string {
  return `${origin.replace(/\/$/, "")}${buildClubPrivacyPath(locale)}`;
}
