import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMatchById } from "@/modules/matches/repository";
import { playerService } from "@/modules/players/service";
import { MatchJoinActions } from "@/components/features/matches/match-join-actions";

type MatchDetailsPageProps = {
  params: Promise<{ locale: string; matchId: string }>;
  searchParams: Promise<{ created?: string; joined?: string; team?: string }>;
};

export default async function MatchDetailsPage({ params, searchParams }: MatchDetailsPageProps) {
  const { locale, matchId } = await params;
  const sp = await searchParams;
  const showCreatedBanner = sp.created === "1" || sp.created === "true";
  const showJoinedBanner = sp.joined === "1" || sp.joined === "true";
  const joinedTeam = sp.team === "A" || sp.team === "B" ? sp.team : null;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  const match = await fetchMatchById(matchId);
  if (!match) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerGender = null;
  let alreadyJoined = false;
  let viewerTeam: "A" | "B" | null = null;
  if (user) {
    const profile = await playerService.getPlayerProfile(user.id);
    viewerGender = profile?.gender ?? null;
    const myRow = match.match_participants.find((p) => p.player_id === user.id);
    alreadyJoined = Boolean(myRow);
    viewerTeam = myRow?.team === "A" || myRow?.team === "B" ? myRow.team : null;
  }

  const teamA = match.match_participants.filter((p) => p.team === "A");
  const teamB = match.match_participants.filter((p) => p.team === "B");

  const typeLabels: Record<string, string> = {
    all: labels.matchTypeLabelAll,
    men_only: labels.matchTypeLabelMenOnly,
    women_only: labels.matchTypeLabelWomenOnly,
    mixed: labels.matchTypeLabelMixed,
  };

  const joinLabels = {
    joinTitle: locale === "en" ? "Join" : "Rejoindre",
    teamA: locale === "en" ? "Team A ({count}/2)" : "Équipe A ({count}/2)",
    teamB: locale === "en" ? "Team B ({count}/2)" : "Équipe B ({count}/2)",
    teamFull: locale === "en" ? "(full)" : "(pleine)",
    alreadyJoined: labels.matchAlreadyJoined,
    viewerTeam: labels.matchJoinedTeamLabel,
    matchClosed: locale === "en" ? "This match is no longer open." : "Ce match n'est plus ouvert.",
    matchFull: locale === "en" ? "Match is full." : "Match complet.",
    genderRequired:
      locale === "en"
        ? "For this match type, set your gender on your profile (or pick an « All » match)."
        : "Pour ce type de match, indique ton genre dans ton profil (ou choisis un match « Tous »).",
    joining: locale === "en" ? "Joining…" : "Inscription…",
  };

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto">
      <Link href={`/${locale}/play-now`} className="text-sm text-sky-400 font-medium">
        ← {labels.playNowTitle}
      </Link>

      {showCreatedBanner ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          {labels.matchCreatedSuccess}
        </div>
      ) : null}

      {showJoinedBanner ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 space-y-1"
        >
          <p className="font-bold">{labels.matchJoinedSuccess}</p>
          {joinedTeam ? (
            <p>{labels.matchJoinedTeamLabel.replace("{team}", joinedTeam)}</p>
          ) : null}
        </div>
      ) : null}

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">{labels.matchTitle}</h1>
        <p className="text-sm text-white/60">
          {match.clubName} ·{" "}
          {new Date(match.starts_at).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
        </p>
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">
          {typeLabels[match.match_gender_type] ?? match.match_gender_type}
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 p-4 space-y-3 bg-surface-elevated">
        <h2 className="text-sm font-bold text-white">
          {locale === "en" ? "Teams" : "Équipes"}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-bold text-white mb-1">A</p>
            <p className="text-white/60">{teamA.length} / 2 joueurs</p>
          </div>
          <div>
            <p className="font-bold text-white mb-1">B</p>
            <p className="text-white/60">{teamB.length} / 2 joueurs</p>
          </div>
        </div>
      </section>

      {user ? (
        <MatchJoinActions
          locale={locale}
          matchId={match.id}
          matchType={match.match_gender_type}
          viewerGender={viewerGender}
          alreadyJoined={alreadyJoined}
          viewerTeam={viewerTeam}
          isOpen={match.status === "open"}
          teamACount={teamA.length}
          teamBCount={teamB.length}
          labels={joinLabels}
        />
      ) : (
        <p className="text-sm text-white/70">
          <Link href={`/${locale}/auth/sign-in`} className="text-sky-400 font-bold underline">
            {locale === "en" ? "Sign in" : "Connecte-toi"}
          </Link>{" "}
          {locale === "en" ? "to join this match." : "pour rejoindre ce match."}
        </p>
      )}
    </div>
  );
}
