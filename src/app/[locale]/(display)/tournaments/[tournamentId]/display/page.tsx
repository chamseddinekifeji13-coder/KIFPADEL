import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { TournamentDisplayBoard } from "@/components/features/tournaments/tournament-display-board";
import {
  buildClubDisplayStandings,
  buildDisplayCategorySections,
} from "@/domain/rules/tournament-display";
import { parseTournamentCategories } from "@/domain/rules/tournament-categories";
import {
  getTournamentWithClub,
  listEntriesWithDisplayNames,
  listParticipatingClubsForTournament,
  listSoloEntriesWithDisplayNames,
  listTournamentMatchesWithResults,
} from "@/modules/tournaments/repository";
import { listActiveSponsorsForPublic } from "@/modules/sponsors/repository";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; tournamentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await getTournamentWithClub(tournamentId);
  if (!tournament) {
    return { title: "Tournoi" };
  }
  return {
    title: `${tournament.title} · Live`,
    robots: { index: false, follow: false },
  };
}

export default async function TournamentDisplayPage({ params }: Props) {
  const { locale, tournamentId } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const tournament = await getTournamentWithClub(tournamentId);
  if (!tournament) {
    notFound();
  }

  if (tournament.status === "draft" || tournament.status === "cancelled") {
    notFound();
  }

  const configuredCategories = parseTournamentCategories(tournament.settings);

  const dictionary = await getDictionary(locale as Locale);

  const [entries, soloEntries, matches, participatingClubs, sponsors] = await Promise.all([
    listEntriesWithDisplayNames(tournamentId),
    listSoloEntriesWithDisplayNames(tournamentId),
    listTournamentMatchesWithResults(tournamentId),
    listParticipatingClubsForTournament(tournamentId),
    listActiveSponsorsForPublic(),
  ]);

  const activeEntries = entries.filter((e) => e.status !== "withdrawn");
  const activeSolo = soloEntries.filter((e) => e.status !== "withdrawn");

  const { sections, multiCategory } = buildDisplayCategorySections({
    locale,
    format: tournament.format,
    configuredCategories,
    entries,
    soloEntries,
    matches,
  });

  const clubStandings =
    tournament.tournamentScope === "interclub"
      ? buildClubDisplayStandings(
          tournament.format,
          participatingClubs,
          activeEntries,
          activeSolo.map((e) => ({
            representingClubId: e.representingClubId,
            americanoPoints: e.americanoPoints,
          })),
          matches,
        )
      : [];

  return (
    <TournamentDisplayBoard
      locale={locale as Locale}
      title={tournament.title}
      clubName={tournament.clubName}
      clubCity={tournament.clubCity}
      format={tournament.format}
      tournamentScope={tournament.tournamentScope}
      status={tournament.status}
      sections={sections}
      multiCategory={multiCategory}
      clubStandings={clubStandings}
      sponsors={sponsors}
      sponsorsTitle={dictionary.common.sponsorsPartnersTitle}
      serverTimeIso={new Date().toISOString()}
    />
  );
}
