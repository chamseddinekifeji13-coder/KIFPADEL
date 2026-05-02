import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClubCard } from "@/components/features/clubs/club-card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { clubService } from "@/modules/clubs/service";

type ClubsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string }>;
};

export async function generateMetadata({ params }: ClubsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Explore clubs" : "Explorer les clubs",
    description: isEn
      ? "Browse active padel clubs and pick the best venue for your next match."
      : "Parcourez les clubs de padel actifs et choisissez le meilleur terrain pour votre prochain match.",
    alternates: { canonical: `/${locale}/clubs` },
  };
}

export default async function ClubsPage({ params, searchParams }: ClubsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { city } = await searchParams;

  const dictionary = await getDictionary(locale as Locale);
  const clubs = await clubService.getClubs(city);
  const isEn = locale === "en";

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-black text-white">
          {isEn ? "Explore Clubs" : "Explorer les clubs"}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {isEn
            ? "Find nearby clubs and book your next court in seconds."
            : "Trouvez les clubs autour de vous et réservez votre prochain terrain en quelques secondes."}
        </p>
      </header>

      <form className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          name="city"
          defaultValue={city ?? ""}
          placeholder={isEn ? "Filter by city (e.g. Tunis)" : "Filtrer par ville (ex: Tunis)"}
          className="h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white placeholder:text-[var(--foreground-muted)]"
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-[var(--gold)] px-4 text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)]"
        >
          {isEn ? "Search" : "Rechercher"}
        </button>
      </form>

      {clubs.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--foreground-muted)]">
          {isEn
            ? "No clubs found for this filter."
            : "Aucun club trouvé pour ce filtre."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={{
                id: club.id,
                name: club.name,
                city: club.city,
                type: club.type,
                logo_url: club.logo_url,
              }}
              locale={locale}
            />
          ))}
        </div>
      )}

      <div className="grid gap-2 pt-1 sm:grid-cols-2">
        <Link
          href={`/${locale}/onboarding/club`}
          className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-4 py-3 text-center text-sm font-semibold text-[var(--gold)] hover:bg-[var(--gold)]/20"
        >
          {isEn ? "Start club onboarding" : "Démarrer l'onboarding club"}
        </Link>
        <Link
          href={`/${locale}/onboarding/super-admin`}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-semibold text-white hover:border-[var(--gold)]/30"
        >
          {isEn ? "Super admin onboarding" : "Onboarding super admin"}
        </Link>
      </div>

      <p className="text-center text-xs text-[var(--foreground-muted)]">{dictionary.club.createHint}</p>
    </section>
  );
}
