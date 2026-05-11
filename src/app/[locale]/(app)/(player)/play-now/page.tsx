import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import Link from "next/link";

import { matchService } from "@/modules/matches/service";
import { MatchWithDetails } from "@/modules/matches/repository";
import { MatchCard, type MatchCardMatchTypeUi } from "@/components/features/matches/match-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Trophy } from "lucide-react";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { playerService } from "@/modules/players/service";
import type { Gender, MatchGenderType } from "@/domain/types/core";
import { cn } from "@/lib/utils/cn";

type PlayNowPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
};

function parseMatchTypeFilter(raw: string | undefined): MatchGenderType | null {
  if (raw === "all" || raw === "men_only" || raw === "women_only" || raw === "mixed") {
    return raw;
  }
  return null;
}

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

export default async function PlayNowPage({ params, searchParams }: PlayNowPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { type: typeParam } = await searchParams;
  const typeFilter = parseMatchTypeFilter(typeParam);
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  const pageTitle = labels.playNowTitle;

  let matches: MatchWithDetails[] = [];
  let viewerGender: Gender | null = null;
  let isSignedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isSignedIn = Boolean(user);
    if (user) {
      const profile = await playerService.getPlayerProfile(user.id);
      viewerGender = profile?.gender ?? null;
    }
    matches = await matchService.getOpenMatches(viewerGender);
  } catch (err) {
    rethrowFrameworkError(err);
    console.error("Failed to fetch matches:", err);
  }

  const displayedMatches =
    typeFilter != null
      ? matches.filter((m) => m.match_gender_type === typeFilter)
      : matches;

  const totalOpenMatches = matches.length;
  const showGenderProfileHint =
    isSignedIn && viewerGender === null;
  const isFilteredEmpty =
    displayedMatches.length === 0 &&
    totalOpenMatches > 0 &&
    typeFilter != null;

  let primaryEmptyMessage = labels.playNowEmptyNoMatchesAtAll;
  if (isFilteredEmpty) {
    if (typeFilter === "mixed") {
      primaryEmptyMessage = labels.playNowEmptyFilterNoMatchesMixed;
    } else if (typeFilter === "all") {
      primaryEmptyMessage = labels.playNowEmptyNoMatchesAtAll;
    } else {
      primaryEmptyMessage = labels.playNowEmptyFilterNoMatches;
    }
  }

  const matchTypeUi: MatchCardMatchTypeUi = {
    labelByType: {
      all: labels.matchTypeLabelAll,
      men_only: labels.matchTypeLabelMenOnly,
      women_only: labels.matchTypeLabelWomenOnly,
      mixed: labels.matchTypeLabelMixed,
    },
    titleByType: {
      all: labels.matchTypeTitleAll,
      men_only: labels.matchTypeTitleMenOnly,
      women_only: labels.matchTypeTitleWomenOnly,
      mixed: labels.matchTypeTitleMixed,
    },
  };

  const typeFilterChips: {
    value: MatchGenderType | null;
    label: string;
    href: string;
    title: string;
  }[] = [
    {
      value: null,
      label: labels.playNowFilterAll,
      href: `/${locale}/play-now`,
      title: labels.playNowFilterTitleAll,
    },
    {
      value: "men_only",
      label: labels.playNowFilterMen,
      href: `/${locale}/play-now?type=men_only`,
      title: labels.playNowFilterTitleMen,
    },
    {
      value: "women_only",
      label: labels.playNowFilterWomen,
      href: `/${locale}/play-now?type=women_only`,
      title: labels.playNowFilterTitleWomen,
    },
    {
      value: "mixed",
      label: labels.playNowFilterMixed,
      href: `/${locale}/play-now?type=mixed`,
      title: labels.playNowFilterTitleMixed,
    },
  ];

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle
          title={labels.openMatchesSectionTitle}
          icon={<Trophy className="h-6 w-6" />}
        />
        <nav
          className="flex flex-wrap gap-2"
          aria-label={labels.playNowTypeFilterGroupAria}
        >
          {typeFilterChips.map((chip) => {
            const isActive =
              chip.value === null ? typeFilter == null : typeFilter === chip.value;
            return (
              <Link
                key={chip.href}
                href={chip.href}
                scroll={false}
                title={chip.title}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {chip.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {displayedMatches.length === 0 ? (
        <div className="py-12 text-center space-y-3 max-w-md mx-auto">
          <p className="text-slate-500 italic font-medium">
            {primaryEmptyMessage}
          </p>
          {showGenderProfileHint ? (
            <p className="text-sm text-slate-400 leading-relaxed px-2">
              {labels.playNowGenderIncompleteHint}
            </p>
          ) : null}
          {isFilteredEmpty ? (
            <Link
              href={`/${locale}/play-now`}
              scroll={false}
              className="inline-flex px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200 active:scale-95 transition-transform"
            >
              {labels.playNowEmptyFilterTryAll}
            </Link>
          ) : (
            <Link href={`/${locale}/matches/create`}>
              <button
                type="button"
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200 active:scale-95 transition-transform"
              >
                {labels.createMatchCta}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {displayedMatches.map((match) => (
            <MatchCard
              key={match.id}
              locale={locale}
              matchTypeUi={matchTypeUi}
              match={{
                id: match.id,
                starts_at: match.starts_at,
                clubName: match.clubName,
                clubCity: match.clubs?.city?.trim() || "Tunis",
                clubAddress: match.clubAddress,
                playerCount: match.playerCount,
                price_per_player: match.price_per_player ?? 0,
                match_gender_type: match.match_gender_type,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
