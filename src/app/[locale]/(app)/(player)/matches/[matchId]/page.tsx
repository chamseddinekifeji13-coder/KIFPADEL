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
};

export default async function MatchDetailsPage({ params }: MatchDetailsPageProps) {
  const { locale, matchId } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const match = await fetchMatchById(matchId);
  if (!match) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerGender = null;
  let alreadyJoined = false;
  if (user) {
    const profile = await playerService.getPlayerProfile(user.id);
    viewerGender = profile?.gender ?? null;
    alreadyJoined = match.match_participants.some((p) => p.player_id === user.id);
  }

  const teamA = match.match_participants.filter((p) => p.team === "A");
  const teamB = match.match_participants.filter((p) => p.team === "B");

  const typeLabels: Record<string, string> = {
    all: dictionary.player.matchTypeLabelAll,
    men_only: dictionary.player.matchTypeLabelMenOnly,
    women_only: dictionary.player.matchTypeLabelWomenOnly,
    mixed: dictionary.player.matchTypeLabelMixed,
  };

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto">
      <Link href={`/${locale}/play-now`} className="text-sm text-sky-600 font-medium">
        ← {dictionary.player.playNowTitle}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          {dictionary.player.matchTitle}
        </h1>
        <p className="text-sm text-slate-500">
          {match.clubName} · {new Date(match.starts_at).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
        </p>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
          {typeLabels[match.match_gender_type] ?? match.match_gender_type}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
        <h2 className="text-sm font-bold text-slate-800">Équipes</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-bold text-slate-700 mb-1">A</p>
            <p className="text-slate-500">{teamA.length} / 2 joueurs</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-1">B</p>
            <p className="text-slate-500">{teamB.length} / 2 joueurs</p>
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
          isOpen={match.status === "open"}
          teamACount={teamA.length}
          teamBCount={teamB.length}
        />
      ) : (
        <p className="text-sm text-slate-600">
          <Link href={`/${locale}/auth/sign-in`} className="text-sky-600 font-bold underline">
            Connecte-toi
          </Link>{" "}
          pour rejoindre ce match.
        </p>
      )}
    </div>
  );
}
