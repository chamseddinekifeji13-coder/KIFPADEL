import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchProfilesForPartnerPick,
  getTournamentWithClub,
  listEntriesWithDisplayNames,
  listTournamentMatchesWithResults,
} from "@/modules/tournaments/repository";
import type { ProfilePick } from "@/modules/tournaments/repository";
import { TournamentRegisterForm } from "@/app/[locale]/(player)/tournaments/[tournamentId]/tournament-register-form";

type Props = { params: Promise<{ locale: string; tournamentId: string }> };

export default async function PlayerTournamentDetailPage({ params }: Props) {
  const { locale, tournamentId } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;

  const tournament = await getTournamentWithClub(tournamentId);
  if (!tournament) notFound();

  const regionsDisplay =
    typeof tournament.scopeMetadata.regions_display === "string"
      ? tournament.scopeMetadata.regions_display.trim()
      : "";
  const scopeLabel =
    tournament.tournamentScope === "interclub"
      ? labels.tournamentsScopeInterclub
      : tournament.tournamentScope === "inter_region"
        ? labels.tournamentsScopeInterRegion
        : tournament.tournamentScope === "platform"
          ? labels.tournamentsDetailScopePlatform
          : null;

  const statusLabel = (
    {
      draft: labels.tournamentListStatusDraft,
      registration_open: labels.tournamentListStatusRegistrationOpen,
      in_progress: labels.tournamentListStatusInProgress,
      completed: labels.tournamentListStatusCompleted,
      cancelled: labels.tournamentListStatusCancelled,
    } as Record<string, string>
  )[tournament.status] ?? tournament.status;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entries = await listEntriesWithDisplayNames(tournamentId);
  const matches = await listTournamentMatchesWithResults(tournamentId);

  let canRegister = false;
  let partners: ProfilePick[] = [];
  if (user && tournament.status === "registration_open") {
    const inTournament = entries.some((e) => e.player1Id === user.id || e.player2Id === user.id);
    if (!inTournament) {
      canRegister = true;
      partners = await fetchProfilesForPartnerPick(user.id);
    }
  }

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto pb-24">
      <Link href={`/${locale}/tournaments`} className="text-sm text-sky-600 font-medium">
        {labels.tournamentsBackToList}
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{tournament.title}</h1>
        <p className="text-sm text-slate-500">
          {tournament.clubName}
          {tournament.clubCity ? ` · ${tournament.clubCity}` : ""}
          {scopeLabel ? ` · ${scopeLabel}` : ""}
        </p>
        {regionsDisplay ? (
          <p className="mt-1 text-xs text-slate-600">
            {labels.tournamentsDetailRegionsLabel}: {regionsDisplay}
          </p>
        ) : null}
        <p className="mt-1 text-xs font-bold uppercase text-slate-600">{statusLabel}</p>
      </header>

      {user && entries.some((e) => e.player1Id === user.id || e.player2Id === user.id) ? (
        <p className="text-sm font-medium text-emerald-700">{labels.tournamentDetailRegisteredBanner}</p>
      ) : null}

      {user ? (
        <TournamentRegisterForm
          locale={locale}
          tournamentId={tournamentId}
          partners={partners}
          canRegister={canRegister}
        />
      ) : (
        <p className="text-sm text-slate-600">
          <Link href={`/${locale}/auth/sign-in`} className="text-sky-600 font-bold">
            Connecte-toi
          </Link>{" "}
          pour t&apos;inscrire.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">Équipes inscrites</h2>
        <ul className="text-sm text-slate-600 space-y-1">
          {entries.map((e) => (
            <li key={e.id}>
              {e.player1Name} + {e.player2Name}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">Tableau (phase 1)</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-500">Pas encore généré.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {matches.map((m) => (
              <li key={m.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  {m.round} #{m.position + 1}
                </p>
                {m.winnerTeam ? (
                  <p className="text-emerald-700 font-bold">Vainqueur équipe {m.winnerTeam}</p>
                ) : (
                  <p className="text-slate-500">En attente de résultat</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
