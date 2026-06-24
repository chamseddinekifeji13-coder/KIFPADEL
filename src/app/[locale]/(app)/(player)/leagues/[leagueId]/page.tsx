import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeChampionshipStandings } from "@/domain/rules/championship-standings";
import { formatChampionshipEntryLabel } from "@/domain/types/championships";
import {
  getChampionshipById,
  listDivisionsForLeague,
  listEntriesForLeague,
  listPartnerCandidatesForChampionship,
  listResultsForLeague,
  playerAlreadyInChampionship,
} from "@/modules/championships/repository";
import { ChampionshipRegisterForm } from "@/app/[locale]/(app)/(player)/leagues/[leagueId]/championship-register-form";
import type { ChampionshipStatus } from "@/domain/types/championships";

type Props = { params: Promise<{ locale: string; leagueId: string }> };

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

export default async function PlayerLeagueDetailPage({ params }: Props) {
  const { locale, leagueId } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const champLabels = dictionary.championships;
  const playerLabels = dictionary.player;

  const league = await getChampionshipById(leagueId);
  if (!league) notFound();

  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth.getUser();
  const user = authResult.data.user;

  const [divisions, entries, results, alreadyRegistered, partners] = await Promise.all([
    listDivisionsForLeague(leagueId),
    listEntriesForLeague(leagueId),
    listResultsForLeague(leagueId),
    user ? playerAlreadyInChampionship(leagueId, user.id) : Promise.resolve(false),
    user ? listPartnerCandidatesForChampionship(user.id) : Promise.resolve([]),
  ]);

  const canRegister = league.status === "registration_open" && Boolean(user) && !alreadyRegistered;

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto pb-24">
      <Link href={`/${locale}/leagues`} className="text-sm text-sky-600 font-medium">
        {playerLabels.leaguesBackToList}
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{league.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {league.clubName ? `${league.clubName} · ` : ""}
          {league.seasonLabel} · {statusLabel(league.status, champLabels)}
        </p>
        {league.description ? <p className="mt-2 text-sm text-slate-600">{league.description}</p> : null}
      </header>

      {canRegister ? (
        <ChampionshipRegisterForm
          locale={locale}
          leagueId={leagueId}
          divisions={divisions}
          partners={partners}
          canRegister={canRegister}
          labels={champLabels}
        />
      ) : alreadyRegistered ? (
        <p className="text-sm text-emerald-700 bg-emerald-500/10 rounded-xl p-3">
          {playerLabels.leaguesDetailRegisteredBanner}
        </p>
      ) : null}

      {divisions.map((division) => {
        const divisionEntries = entries
          .filter((e) => e.divisionId === division.id)
          .map((e) => ({ id: e.id, label: formatChampionshipEntryLabel(e) }));
        const divisionResults = results
          .filter((r) => r.divisionId === division.id)
          .map((r) => ({
            homeEntryId: r.homeEntryId,
            awayEntryId: r.awayEntryId,
            homeSetsWon: r.homeSetsWon,
            awaySetsWon: r.awaySetsWon,
            winnerEntryId: r.winnerEntryId,
          }));
        const standings = computeChampionshipStandings(
          divisionEntries,
          divisionResults,
          league.pointsPerWin,
          league.pointsPerLoss,
        );

        return (
          <section key={division.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <h2 className="text-sm font-bold text-slate-900">{division.name}</h2>
            {standings.length === 0 ? (
              <p className="text-sm text-slate-500">{champLabels.leaguesDetailNoEntries}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {standings.map((row) => (
                  <li key={row.entryId} className="flex justify-between gap-2 border-t border-slate-100 py-2 first:border-0">
                    <span>
                      <span className="font-bold text-amber-600 mr-2">{row.rank}</span>
                      {row.label}
                    </span>
                    <span className="font-semibold text-slate-700">{row.points} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
