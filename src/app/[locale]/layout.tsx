import { notFound } from "next/navigation";

import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { AppShell } from "@/components/layout/app-shell";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <AppShell
      locale={locale}
      appName={dictionary.common.appName}
      tagline={`${dictionary.common.tagline} · default ${DEFAULT_LOCALE}`}
      navLabels={{
        home: dictionary.navigation.home,
        play: dictionary.navigation.play,
        find: dictionary.navigation.find,
        book: dictionary.navigation.book,
        profile: dictionary.navigation.profile,
      }}
      authLabels={{
        guest: dictionary.auth.guestLabel,
        signIn: dictionary.auth.signInCta,
        signedInAs: dictionary.auth.signedInAs,
        signOut: dictionary.auth.signOutCta,
      }}
    >
      {children}
    </AppShell>
  );
}
