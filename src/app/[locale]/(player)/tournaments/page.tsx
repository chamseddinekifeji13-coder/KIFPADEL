import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listDiscoverableTournaments } from "@/modules/tournaments/repository";

type Props = { params: Promise<{ locale: string }> };

export default async function PlayerTournamentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;

  const tournaments = await listDiscoverableTournaments();

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto pb-24">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{labels.tournamentsPlayerTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">{labels.tournamentsPlayerSubtitle}</p>
      </header>

      {tournaments.length === 0 ? (
        <p className="text-sm text-slate-500">{labels.tournamentsPlayerEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/${locale}/tournaments/${t.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-sky-300 transition-colors"
              >
                <p className="font-bold text-slate-900">{t.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {t.clubName}
                  {t.clubCity ? ` · ${t.clubCity}` : ""}
                </p>
                <p className="text-[10px] uppercase font-bold text-sky-700 mt-1">{t.status}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
