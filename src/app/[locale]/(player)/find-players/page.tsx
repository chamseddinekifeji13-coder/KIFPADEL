import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { playerService } from "@/modules/players/service";
import { Player } from "@/modules/players/repository";
import { PlayerCard } from "@/components/features/players/player-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";

import { Search, Filter, Users } from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

type FindPlayersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: FindPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const title = dictionary.player.findPlayersMetaTitle;
  const description = dictionary.player.findPlayersMetaDescription;
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/find-players` },
    openGraph: { title, description, url: `/${locale}/find-players` },
  };
}

export default async function FindPlayersPage({
  params,
  searchParams,
}: FindPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  const title = labels.findPlayersTitle;
  const subtitle = labels.findPlayersSubtitle;

  // Fetch real data from Supabase with heavy protection
  let players: Player[] = [];
  try {
    const data = await playerService.getPlayers(q);
    if (Array.isArray(data)) {
      players = data.filter((p) => p && typeof p === "object" && p.id);
    }
  } catch (err) {
    rethrowFrameworkError(err);
    console.error("Failed to fetch players in FindPlayersPage:", err);
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>

      <div className="relative">
        <form action="" role="search">
          <label htmlFor="find-players-search" className="sr-only">
            {labels.findPlayersSearchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          />
          <input
            id="find-players-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={labels.findPlayersSearchPlaceholder}
            aria-label={labels.findPlayersSearchLabel}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm min-h-11"
          />
        </form>
      </div>

      <div className="flex items-center justify-between">
        <SectionTitle
          title={labels.nearbyPlayersTitle}
          icon={<Users className="h-4 w-4" />}
        />
        <button
          type="button"
          aria-label={labels.filtersLabel}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 px-3 rounded-lg bg-slate-100 min-h-11"
        >
          <Filter className="h-3 w-3" aria-hidden="true" />
          {labels.filtersLabel}
        </button>
      </div>

      {/* Recommended list */}
      {!q && players.length > 3 && (
        <section className="space-y-4">
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest px-1">
             ⭐ {labels.topRatedLabel}
           </div>
           <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
             {players.slice(0, 5).map((player) => (
                <div key={player.id} className="min-w-[140px] flex flex-col items-center gap-3 p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                  <Avatar src={player.avatar_url} alt={player.display_name || labels.genericPlayerName} size="lg" className="ring-4 ring-sky-50" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-900 truncate w-24">{(player.display_name || labels.genericPlayerName).split(" ")[0]}</p>
                    <Badge variant={(player.league || labels.defaultLeagueLabel).toLowerCase() as BadgeProps["variant"]} className="text-[8px] px-2">{player.league || labels.defaultLeagueLabel}</Badge>
                  </div>
                </div>
             ))}
           </div>
        </section>
      )}

      {players.length === 0 ? (
        <div className="py-12 text-center text-slate-500 italic">
          {q ? `${labels.noPlayersForQueryPrefix} "${q}".` : labels.noPlayersAvailable}
        </div>
      ) : (
        <div className="grid gap-3">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}
