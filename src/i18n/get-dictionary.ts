import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

export type Dictionary = {
  common: Record<string, string>;
  navigation: Record<string, string>;
  auth: Record<string, string>;
  onboarding: Record<string, string>;
  player: Record<string, string>;
  club: Record<string, string>;
  errors: Record<string, string>;
  admin: Record<string, string>;
};

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  fr: async () => ({
    common: (await import("@/i18n/locales/fr/common.json")).default,
    navigation: (await import("@/i18n/locales/fr/navigation.json")).default,
    auth: (await import("@/i18n/locales/fr/auth.json")).default,
    onboarding: (await import("@/i18n/locales/fr/onboarding.json")).default,
    player: (await import("@/i18n/locales/fr/player.json")).default,
    club: (await import("@/i18n/locales/fr/club.json")).default,
    errors: (await import("@/i18n/locales/fr/errors.json")).default,
    admin: (await import("@/i18n/locales/fr/admin.json")).default,
  }),
  en: async () => ({
    common: (await import("@/i18n/locales/en/common.json")).default,
    navigation: (await import("@/i18n/locales/en/navigation.json")).default,
    auth: (await import("@/i18n/locales/en/auth.json")).default,
    onboarding: (await import("@/i18n/locales/en/onboarding.json")).default,
    player: (await import("@/i18n/locales/en/player.json")).default,
    club: (await import("@/i18n/locales/en/club.json")).default,
    errors: (await import("@/i18n/locales/en/errors.json")).default,
    admin: (await import("@/i18n/locales/en/admin.json")).default,
  }),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  return loader();
}
