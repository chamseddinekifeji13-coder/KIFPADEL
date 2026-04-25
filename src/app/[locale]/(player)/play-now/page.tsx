import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import Link from "next/link";

import { matchService } from "@/modules/matches/service";
import { MatchCard } from "@/components/features/matches/match-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Trophy, Filter } from "lucide-react";

type PlayNowPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PlayNowPage({ params }: PlayNowPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  // Fetch real data from Supabase
  const matches = await matchService.getOpenMatches();

  return (
    <div className="flex-1 p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {dictionary.player.playNowTitle}
        </h1>
        <p className="text-sm text-slate-500">
          Rejoignez une partie en cours et rencontrez de nouveaux joueurs.
        </p>
      </header>

      <div className="flex items-center justify-between">
        <SectionTitle
          title="Parties Ouvertes"
          icon={<Trophy className="h-4 w-4" />}
        />
        <button 
          aria-label="Filtrer les matchs"
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Filter className="h-4 w-4" />
        </button>

      </div>

      {matches.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-slate-500 italic font-medium">
            Aucune partie ouverte pour le moment.
          </p>
          <Link href={`/${locale}/matches/create`}>
            <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200 active:scale-95 transition-transform">
              Créer un match
            </button>
          </Link>
        </div>

      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
