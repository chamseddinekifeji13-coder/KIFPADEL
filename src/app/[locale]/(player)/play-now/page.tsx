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
    <div className="flex-1 space-y-8">
      <header className="space-y-2 text-left">
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">
          {pageTitle}
        </h1>
        <p className="text-sm text-foreground-muted max-w-sm font-medium">
          {labels.playNowDescription}
        </p>
      </header>

      <div className="flex flex-col items-center gap-6">
        <SectionTitle
          title={labels.openMatchesSectionTitle}
          icon={<Trophy className="h-6 w-6" />}
        />
        <button
          type="button"
          aria-label={labels.filterMatchesAria}
          disabled
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-foreground-muted border border-white/5 hover:bg-gold/10 hover:text-gold transition-all"
          title={labels.filtersComingSoon}
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="py-20 text-center space-y-6 animate-fade-in">
          <p className="text-foreground-muted italic font-medium">
            {labels.noOpenMatchesTitle}
          </p>
          <Link href={`/${locale}/matches/create`} className="inline-block">
            <button className="px-10 py-4 bg-gold text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-gold-strong hover:bg-gold-light active:scale-95 transition-all">
              {labels.createMatchCta}
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              locale={locale}
              match={{
                id: match.id,
                starts_at: match.starts_at,
                clubName: match.clubName,
                clubCity: match.clubs?.city?.trim() || "Tunis",
                clubAddress: match.clubAddress,
                playerCount: match.playerCount,
                price_per_player: match.price_per_player,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
