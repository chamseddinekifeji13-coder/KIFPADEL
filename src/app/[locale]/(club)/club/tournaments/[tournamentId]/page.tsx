import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import {
  countBracketMatches,
  getTournamentById,
  listEntriesWithDisplayNames,
  listTournamentMatchesWithResults,
} from "@/modules/tournaments/repository";
import { isPowerOfTwoTeamCount } from "@/domain/rules/tournament-bracket";
import { TournamentStaffPanel } from "@/app/[locale]/(club)/club/tournaments/[tournamentId]/tournament-staff-panel";

type Props = { params: Promise<{ locale: string; tournamentId: string }> };

export default async function ClubTournamentDetailPage({ params }: Props) {
  const { locale, tournamentId } = await params;
  if (!isLocale(locale)) notFound();

  await getDictionary(locale as Locale);

  const user = await requireUser({ locale, redirectPath: `club/tournaments/${tournamentId}` });
  const managed = await clubService.getManagedClub(user.id);
  const tournament = await getTournamentById(tournamentId);

  if (!tournament || !managed || managed.id !== tournament.clubId) {
    notFound();
  }

  const [entries, matches, bracketCount] = await Promise.all([
    listEntriesWithDisplayNames(tournamentId),
    listTournamentMatchesWithResults(tournamentId),
    countBracketMatches(tournamentId),
  ]);

  const activeEntries = entries.filter((e) => e.status !== "withdrawn");
  const canGenerateBracket =
    tournament.status === "registration_open" &&
    bracketCount === 0 &&
    isPowerOfTwoTeamCount(activeEntries.length);

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/club/tournaments`} className="text-xs font-bold text-[var(--gold)]">
        ← Tournois
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-white">{tournament.title}</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1 uppercase tracking-wide">{tournament.status}</p>
        {tournament.description ? (
          <p className="text-sm text-white/80 mt-2">{tournament.description}</p>
        ) : null}
        <div className="mt-2 text-xs text-[var(--foreground-muted)] space-y-1">
          {tournament.startsAt ? <p>Début : {new Date(tournament.startsAt).toLocaleString()}</p> : null}
          {tournament.endsAt ? <p>Fin : {new Date(tournament.endsAt).toLocaleString()}</p> : null}
          {tournament.entryFeeCents != null ? (
            <p>Frais : {(tournament.entryFeeCents / 100).toFixed(2)} TND (affichage indicatif)</p>
          ) : null}
        </div>
      </header>

      <TournamentStaffPanel
        locale={locale}
        tournamentId={tournamentId}
        status={tournament.status}
        entries={entries}
        matches={matches}
        canGenerateBracket={canGenerateBracket}
      />
    </div>
  );
}
