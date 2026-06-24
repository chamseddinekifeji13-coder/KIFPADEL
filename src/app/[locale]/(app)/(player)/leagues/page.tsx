import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listDiscoverableChampionships } from "@/modules/championships/repository";
import type { ChampionshipStatus } from "@/domain/types/championships";

type Props = { params: Promise<{ locale: string }> };

function statusLabel(status: ChampionshipStatus, labels: Record<string, string>): string {
  const map: Record<ChampionshipStatus, string> = {
    draft: labels.leaguesStatusDraft,
    registration_open: labels.leaguesStatusRegistrationOpen,
    active: labels.leaguesStatusActive,
    completed: labels.leaguesStatusCompleted,
    cancelled: labels.leaguesStatusCancelled,
  };
  return map[status] ?? status;
}

export default async function PlayerLeaguesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const playerLabels = dictionary.player;
  const champLabels = dictionary.championships;

  const leagues = await listDiscoverableChampionships();

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto pb-24">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{playerLabels.leaguesPlayerTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">{playerLabels.leaguesPlayerSubtitle}</p>
      </header>

      {leagues.length === 0 ? (
        <p className="text-sm text-slate-500">{playerLabels.leaguesPlayerEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {leagues.map((league) => (
            <li key={league.id}>
              <Link
                href={`/${locale}/leagues/${league.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 transition-colors"
              >
                <p className="font-bold text-slate-900">{league.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {league.clubName ? `${league.clubName} · ` : ""}
                  {league.seasonLabel} · {statusLabel(league.status, champLabels)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
