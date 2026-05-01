import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { playerService } from "@/modules/players/service";
import { PlayerCard } from "@/components/features/players/player-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";

import { Search, Filter, Users } from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";

type FindPlayersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: FindPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "Find players" : "Trouver des joueurs";
  const description = isEn
    ? "Find compatible padel partners and opponents near you across Tunisia."
    : "Trouvez des partenaires et adversaires de padel compatibles près de chez vous en Tunisie.";
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
  const { q } = await searchParams;
  const fallback =
    locale === "en"
      ? {
          title: "I am looking for players",
          subtitle: "Find matching partners and opponents near you.",
        }
      : {
          title: "Je cherche des joueurs",
          subtitle: "Trouve des partenaires et adversaires compatibles près de toi.",
        };

  let title = fallback.title;
  let subtitle = fallback.subtitle;

  try {
    const dictionary = await getDictionary(locale as Locale);
    title = dictionary.player.findPlayersTitle ?? fallback.title;
    subtitle = dictionary.player.findPlayersSubtitle ?? fallback.subtitle;
  } catch {
    // Keep local fallback to avoid breaking this critical MVP intent.
  }

  // Keep page resilient even if backend query temporarily fails.
  let players: Awaited<ReturnType<typeof playerService.getPlayers>> = [];
  try {
    players = await playerService.getPlayers(q);
  } catch {
    players = [];
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
            Rechercher un joueur
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
            placeholder="Rechercher un joueur..."
            aria-label="Rechercher un joueur"
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm min-h-11"
          />
        </form>
      </div>

      <div className="flex items-center justify-between">
        <SectionTitle
          title="Joueurs à proximité"
          icon={<Users className="h-4 w-4" />}
        />
        <button
          type="button"
          aria-label="Ouvrir les filtres"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 px-3 rounded-lg bg-slate-100 min-h-11"
        >
          <Filter className="h-3 w-3" aria-hidden="true" />
          Filtres
        </button>
      </div>

      {!q && players.length > 3 && (
        <section className="space-y-4">
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest px-1">
             ⭐ Les mieux notés
           </div>
           <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
             {players.slice(0, 5).map((player) => (
                <div key={player.user_id} className="min-w-[140px] flex flex-col items-center gap-3 p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                  <Avatar src={player.avatar_url} alt={player.display_name} size="lg" className="ring-4 ring-sky-50" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-900 truncate w-24">{player.display_name.split(' ')[0]}</p>
                    <Badge variant={player.league.toLowerCase() as BadgeProps["variant"]} className="text-[8px] px-2">{player.league}</Badge>
                  </div>
                </div>
             ))}
           </div>
        </section>
      )}


      {players.length === 0 ? (
        <div className="py-12 text-center text-slate-500 italic">
          Aucun joueur trouvé pour &quot;{q}&quot;.
        </div>
      ) : (
        <div className="grid gap-3">
          {players.map((player) => (
            <PlayerCard key={player.user_id} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}
