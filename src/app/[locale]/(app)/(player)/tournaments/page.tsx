import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listDiscoverableTournaments } from "@/modules/tournaments/repository";
import { cn } from "@/lib/utils/cn";

type Props = { params: Promise<{ locale: string }> };

function scopeBadgeFromLabels(
  scope: string,
  labels: Record<string, string>,
): { label: string; className: string } | null {
  switch (scope) {
    case "interclub":
      return { label: labels.tournamentsScopeInterclub, className: "bg-amber-500/15 text-amber-900" };
    case "inter_region":
      return { label: labels.tournamentsScopeInterRegion, className: "bg-violet-500/15 text-violet-900" };
    case "platform":
      return { label: labels.tournamentsScopePlatform, className: "bg-sky-600/15 text-sky-900" };
    default:
      return null;
  }
}

function tournamentStatusForList(status: string, labels: Record<string, string>): string {
  const map: Record<string, string> = {
    draft: labels.tournamentListStatusDraft,
    registration_open: labels.tournamentListStatusRegistrationOpen,
    in_progress: labels.tournamentListStatusInProgress,
    completed: labels.tournamentListStatusCompleted,
    cancelled: labels.tournamentListStatusCancelled,
  };
  return map[status] ?? status;
}

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
        <p className="mt-1 text-sm text-slate-500">{labels.tournamentsPlayerSubtitle}</p>
      </header>

      {tournaments.length === 0 ? (
        <p className="text-sm text-slate-500">{labels.tournamentsPlayerEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((t) => {
            const badge = scopeBadgeFromLabels(t.tournamentScope, labels);
            const regions =
              typeof t.scopeMetadata.regions_display === "string" && t.scopeMetadata.regions_display.trim()
                ? t.scopeMetadata.regions_display.trim()
                : null;
            return (
              <li key={t.id}>
                <Link
                  href={`/${locale}/tournaments/${t.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-900">{t.title}</p>
                    {badge ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.clubName}
                    {t.clubCity ? ` · ${t.clubCity}` : ""}
                  </p>
                  {regions ? (
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {labels.tournamentsListRegionsPrefix}: {regions}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] font-bold uppercase text-sky-700">
                    {tournamentStatusForList(t.status, labels)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
