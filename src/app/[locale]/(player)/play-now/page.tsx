import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import Link from "next/link";

import { matchService } from "@/modules/matches/service";
import { MatchWithDetails } from "@/modules/matches/repository";
import { MatchCard } from "@/components/features/matches/match-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Trophy, Filter } from "lucide-react";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

type PlayNowPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PlayNowPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const title = dictionary.player.playNowMetaTitle;
  const description = dictionary.player.playNowMetaDescription;
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/play-now` },
    openGraph: { title, description, url: `/${locale}/play-now` },
  };
}

export default async function PlayNowPage({ params }: PlayNowPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  const pageTitle = labels.playNowTitle;

  let matches: MatchWithDetails[] = [];
  try {
    matches = await matchService.getOpenMatches();
  } catch (err) {
    rethrowFrameworkError(err);
    console.error("Failed to fetch matches:", err);
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-500">
          {labels.playNowDescription}
        </p>
      </header>

      <div className="flex items-center justify-between">
        <SectionTitle
          title={labels.openMatchesSectionTitle}
          icon={<Trophy className="h-4 w-4" />}
        />
        <button
          type="button"
          aria-label={labels.filterMatchesAria}
          disabled
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title={labels.filtersComingSoon}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-slate-500 italic font-medium">
            {labels.noOpenMatchesTitle}
          </p>
          <Link href={`/${locale}/matches/create`}>
            <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200 active:scale-95 transition-transform">
              {labels.createMatchCta}
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
