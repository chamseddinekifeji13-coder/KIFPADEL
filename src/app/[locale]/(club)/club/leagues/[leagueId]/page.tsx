import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import {
  getChampionshipById,
  listStaffPlayerPicksForChampionship,
  listDivisionsForLeague,
  listEntriesForLeague,
  listMovementsForLeague,
  listResultsForLeague,
} from "@/modules/championships/repository";
import { ChampionshipStaffPanel } from "@/app/[locale]/(club)/club/leagues/[leagueId]/championship-staff-panel";
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

export default async function ClubLeagueDetailPage({ params }: Props) {
  const { locale, leagueId } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.championships;

  const user = await requireUser({ locale, redirectPath: `club/leagues/${leagueId}` });
  const managed = await clubService.getManagedClub(user.id);
  if (!managed) notFound();

  const league = await getChampionshipById(leagueId);
  if (!league || league.clubId !== managed.id) notFound();

  const [divisions, entries, results, movements, clubPlayers] = await Promise.all([
    listDivisionsForLeague(leagueId),
    listEntriesForLeague(leagueId),
    listResultsForLeague(leagueId),
    listMovementsForLeague(leagueId),
    listStaffPlayerPicksForChampionship(league.clubId),
  ]);

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/club/leagues`} className="text-xs font-bold text-[var(--gold)]">
        ← {labels.navLeagues}
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-white">{league.title}</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">
          {league.seasonLabel} · {statusLabel(league.status, labels)}
          {league.description ? ` · ${league.description}` : ""}
        </p>
      </header>

      <ChampionshipStaffPanel
        locale={locale}
        labels={labels}
        league={league}
        divisions={divisions}
        entries={entries}
        results={results}
        movements={movements}
        clubPlayers={clubPlayers}
      />
    </div>
  );
}
