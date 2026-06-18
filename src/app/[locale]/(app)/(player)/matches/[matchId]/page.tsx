import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMatchById } from "@/modules/matches/repository";
import { playerService } from "@/modules/players/service";
import { MatchJoinActions } from "@/components/features/matches/match-join-actions";
import { fetchKifWalletBalance } from "@/modules/wallet/repository";
import {
  isActiveMatchParticipantRow,
  resolveSharePrice,
  resolveViewerParticipationPhase,
} from "@/domain/rules/match-participant";

type MatchDetailsPageProps = {
  params: Promise<{ locale: string; matchId: string }>;
  searchParams: Promise<{
    created?: string;
    reserved?: string;
    confirmed?: string;
    team?: string;
  }>;
};

export default async function MatchDetailsPage({ params, searchParams }: MatchDetailsPageProps) {
  const { locale, matchId } = await params;
  const sp = await searchParams;
  const showCreatedBanner = sp.created === "1" || sp.created === "true";
  const showReservedBanner = sp.reserved === "1" || sp.reserved === "true";
  const showConfirmedBanner = sp.confirmed === "1" || sp.confirmed === "true";
  const bannerTeam = sp.team === "A" || sp.team === "B" ? sp.team : null;
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
  let participationPhase: "none" | "pending" | "confirmed" = "none";
  let viewerTeam: "A" | "B" | null = null;
  let sharePrice = match.price_per_player;
  let walletBalance = 0;

  if (user) {
    walletBalance = await fetchKifWalletBalance(user.id);
    const profile = await playerService.getPlayerProfile(user.id);
    viewerGender = profile?.gender ?? null;
    const myRow = match.match_participants.find((p) => p.player_id === user.id);
    if (myRow) {
      participationPhase = resolveViewerParticipationPhase(myRow);
      viewerTeam = myRow.team === "A" || myRow.team === "B" ? myRow.team : null;
      sharePrice = resolveSharePrice(myRow, match.price_per_player);
    }
  }

  const activeParticipants = match.match_participants.filter((p) => isActiveMatchParticipantRow(p));
  const teamA = activeParticipants.filter((p) => p.team === "A");
  const teamB = activeParticipants.filter((p) => p.team === "B");

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
    participationConfirmed: labels.matchParticipationConfirmed,
    participationPendingTitle: labels.matchParticipationPendingTitle,
    participationPendingHint: labels.matchParticipationPendingHint,
    viewerTeam: labels.matchJoinedTeamLabel,
    matchClosed: locale === "en" ? "This match is no longer open." : "Ce match n'est plus ouvert.",
    matchFull: locale === "en" ? "Match is full." : "Match complet.",
    genderRequired:
      locale === "en"
        ? "For this match type, set your gender on your profile (or pick an « All » match)."
        : "Pour ce type de match, indique ton genre dans ton profil (ou choisis un match « Tous »).",
    joining: locale === "en" ? "Joining…" : "Inscription…",
    confirmParticipation: labels.matchConfirmParticipation,
    declineParticipation: labels.matchDeclineParticipation,
    confirming: locale === "en" ? "Confirming…" : "Confirmation…",
    declining: locale === "en" ? "Declining…" : "Déclinaison…",
    commitmentLabel: labels.matchPaymentCommitmentLabel,
    commitmentRequired: labels.matchCommitmentRequired,
    paymentRequired: labels.matchPaymentMethodRequired,
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

      {showReservedBanner && participationPhase === "pending" ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 space-y-1"
        >
          <p className="font-bold">{labels.matchParticipationReserved}</p>
          {bannerTeam ? (
            <p>{labels.matchJoinedTeamLabel.replace("{team}", bannerTeam)}</p>
          ) : null}
        </div>
      ) : null}

      {showConfirmedBanner && participationPhase === "confirmed" ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 space-y-1"
        >
          <p className="font-bold">{labels.matchJoinedSuccess}</p>
          {viewerTeam ? (
            <p>{labels.matchJoinedTeamLabel.replace("{team}", viewerTeam)}</p>
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
        {sharePrice > 0 ? (
          <p className="text-sm text-white/70">
            {locale === "en" ? "Your share" : "Votre part"} : {sharePrice} DT
          </p>
        ) : null}
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
          participationPhase={participationPhase}
          viewerTeam={viewerTeam}
          sharePrice={sharePrice}
          clubName={match.clubName}
          walletBalance={walletBalance}
          walletHref={`/${locale}/profile/wallet`}
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
