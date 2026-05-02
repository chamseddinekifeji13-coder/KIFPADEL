import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { clubService } from "@/modules/clubs/service";
<<<<<<< HEAD
import { type Club } from "@/modules/clubs/repository";
import { ClubCard } from "@/components/features/clubs/club-card";
import { SectionTitle } from "@/components/ui/section-title";
import { LayoutGrid, MapPin } from "lucide-react";
=======
import { NearbyClubsBrowser } from "@/components/features/clubs/nearby-clubs-browser";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
>>>>>>> b2609a9c71c35b9c11096306995ce2453a1b02ac

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

<<<<<<< HEAD
  // Fetch real clubs from Supabase
  let clubs: Club[] = [];
  try {
    clubs = await clubService.getClubs();
  } catch (err) {
    console.error("Failed to fetch clubs:", err);
=======
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
>>>>>>> b2609a9c71c35b9c11096306995ce2453a1b02ac
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

<<<<<<< HEAD
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {["Tous", "Tunis", "Sousse", "Hammamet", "Sfax"].map((city, i) => (
          <button
            key={city}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              i === 0
                ? "bg-sky-600 text-white shadow-md shadow-sky-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <SectionTitle
          title="Meilleurs Clubs"
          icon={<LayoutGrid className="h-4 w-4" />}
        />
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <MapPin className="h-3 w-3" />
          À proximité
        </div>
      </div>

      <div className="grid gap-6">
        {clubs.map((club) => (
          <ClubCard key={club.id} club={club} locale={locale} />
        ))}
      </div>
=======
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
>>>>>>> b2609a9c71c35b9c11096306995ce2453a1b02ac
    </div>
  );
}
