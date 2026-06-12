import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { clubService } from "@/modules/clubs/service";
import { NearbyClubsBrowser } from "@/components/features/clubs/nearby-clubs-browser";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

type BookPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ clubMissing?: string; invalidClubLink?: string }>;
};

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "Book a court" : "Réserver un terrain";
  const description = isEn
    ? "Book a padel court at the best clubs in Tunis, Sousse, Hammamet and Sfax."
    : "Réservez un terrain de padel dans les meilleurs clubs de Tunis, Sousse, Hammamet and Sfax.";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/book` },
    openGraph: { title, description, url: `/${locale}/book` },
  };
}

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { clubMissing, invalidClubLink } = await searchParams;
  const showInvalidLinkNotice =
    invalidClubLink === "1" || invalidClubLink === "true" || invalidClubLink === "yes";
  const showClubUnavailableNotice =
    !showInvalidLinkNotice &&
    (clubMissing === "1" || clubMissing === "true" || clubMissing === "yes");

  const fallbackTitle = locale === "en" ? "Book a court" : "Réserver un terrain";

  let pageTitle = fallbackTitle;
  try {
    const dictionary = await getDictionary(locale as Locale);
    pageTitle = dictionary.player?.bookTitle ?? fallbackTitle;
  } catch {
    // keep fallback
  }

  // Fetch real clubs from Supabase
  let clubs: Awaited<ReturnType<typeof clubService.getClubs>> = [];
  try {
    clubs = await clubService.getClubs();
  } catch (err) {
    rethrowFrameworkError(err);
    console.error("Failed to fetch clubs:", err);
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      {showInvalidLinkNotice ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {locale === "en" ? (
            <p>
              The reservation link looks like documentation text (for example{' '}
              <code className="rounded bg-black/40 px-1">&lt;uuid-club&gt;</code>) instead of a real club
              identifier. Use <strong>Réservez un terrain</strong> from a club card below, or open the club from
              the list — the address must contain a long code with dashes (UUID).
            </p>
          ) : (
            <p>
              Le lien de réservation ressemble à un <strong>exemple</strong> de documentation (texte comme{' '}
              <code className="rounded bg-black/40 px-1">&lt;uuid-club&gt;</code>) au lieu d&apos;un vrai identifiant
              de club. Utilisez le bouton depuis la carte d&apos;un club ci-dessous ; l&apos;adresse doit contenir un
              long identifiant avec des tirets (format UUID).
            </p>
          )}
        </div>
      ) : null}

      {showClubUnavailableNotice ? (
        <div
          role="status"
            className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          {locale === "en" ? (
            <p>
              This club is unavailable, disabled, or the link is outdated. Pick another venue below.
            </p>
          ) : (
            <p>
              Ce club est introuvable, désactivé ou le lien n&apos;est plus valide. Choisissez un autre club
              ci-dessous.
            </p>
          )}
        </div>
      ) : null}

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
          address: club.address,
          indoor_courts_count: club.indoor_courts_count,
          outdoor_courts_count: club.outdoor_courts_count,
          type: club.type,
          logo_url: club.logo_url,
        }))}
        locale={locale}
      />
    </div>
  );
}
