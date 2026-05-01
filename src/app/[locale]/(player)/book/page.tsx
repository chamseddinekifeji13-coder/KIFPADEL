import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { clubService } from "@/modules/clubs/service";
import { NearbyClubsBrowser } from "@/components/features/clubs/nearby-clubs-browser";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

type BookPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "Book a court" : "Réserver un terrain";
  const description = isEn
    ? "Book a padel court at the best clubs in Tunis, Sousse, Hammamet and Sfax."
    : "Réservez un terrain de padel dans les meilleurs clubs de Tunis, Sousse, Hammamet et Sfax.";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/book` },
    openGraph: { title, description, url: `/${locale}/book` },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const fallbackTitle =
    locale === "en" ? "Book a court" : "Réserver un terrain";

  let pageTitle = fallbackTitle;
  try {
    const dictionary = await getDictionary(locale as Locale);
    pageTitle = dictionary.player?.bookTitle ?? fallbackTitle;
  } catch {
    // keep fallback
  }

  let clubs: Awaited<ReturnType<typeof clubService.getClubs>> = [];
  try {
    clubs = await clubService.getClubs();
  } catch (err) {
    rethrowFrameworkError(err);
    clubs = [];
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-500">
          Réservez un terrain dans les meilleurs clubs de Padel.
        </p>
      </header>

      <NearbyClubsBrowser
        clubs={clubs.map((club) => ({
          id: club.id,
          name: club.name,
          city: club.city,
          type: club.type,
          logo_url: club.logo_url,
        }))}
        locale={locale}
      />
    </div>
  );
}
