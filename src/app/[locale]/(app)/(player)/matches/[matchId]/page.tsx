import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMatchById, fetchMatchResult } from "@/modules/matches/repository";
import { fetchViewerJoinProfile } from "@/modules/players/repository";
import { MatchJoinActions } from "@/components/features/matches/match-join-actions";
import { MatchShareInvitePanel } from "@/components/features/matches/match-share-invite-panel";
import { MatchTeamsRoster } from "@/components/features/matches/match-teams-roster";
import { MatchChatPanel } from "@/components/features/matches/match-chat-panel";
import { MatchScoreForm } from "@/components/features/matches/match-score-form";
import { formatSetScores } from "@/domain/rules/match-score";
import { assertClubStaffCanManage } from "@/modules/clubs/actions/club-staff-guard";
import { fetchKifWalletBalance } from "@/modules/wallet/repository";
import { fetchMatchTeamRatings } from "@/modules/rating/repository";
import {
  canUserAccessMatchChat,
  fetchMatchMessages,
  fetchMatchParticipantNames,
} from "@/modules/matches/messages-repository";
import {
  isActiveMatchParticipantRow,
  isMatchStarted,
  resolveSharePrice,
  resolveViewerParticipationPhase,
} from "@/domain/rules/match-participant";
import { fetchMatchParticipantProfiles } from "@/modules/matches/participant-profiles";
import { clubService } from "@/modules/clubs/service";
import { isRacketRentalOfferedByClub } from "@/modules/bookings/racket-rental-pipeline";

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

  const supabase = await createSupabaseServerClient();
  const [dictionary, match, authResult] = await Promise.all([
    getDictionary(locale as Locale),
    fetchMatchById(matchId),
    supabase.auth.getUser(),
  ]);
  const labels = dictionary.player;
  if (!match) notFound();

  const user = authResult.data.user;
  const activeParticipants = match.match_participants.filter((p) => isActiveMatchParticipantRow(p));
  const teamA = activeParticipants.filter((p) => p.team === "A");
  const teamB = activeParticipants.filter((p) => p.team === "B");

  let participationPhase: "none" | "pending" | "confirmed" = "none";
  let viewerTeam: "A" | "B" | null = null;
  let sharePrice = match.price_per_player;
  if (user) {
    const myRow = match.match_participants.find((p) => p.player_id === user.id);
    if (myRow) {
      participationPhase = resolveViewerParticipationPhase(myRow);
      viewerTeam = myRow.team === "A" || myRow.team === "B" ? myRow.team : null;
      sharePrice = resolveSharePrice(myRow, match.price_per_player);
    }
  }

  const [
    participantProfiles,
    matchResult,
    clubDetails,
    viewerJoinProfile,
    walletBalance,
    chatAccess,
  ] = await Promise.all([
    fetchMatchParticipantProfiles(match.id),
    fetchMatchResult(matchId),
    match.club_id
      ? clubService.getClubDetails(match.club_id).catch(() => null)
      : Promise.resolve(null),
    user ? fetchViewerJoinProfile(user.id) : Promise.resolve(null),
    user ? fetchKifWalletBalance(user.id) : Promise.resolve(0),
    user ? canUserAccessMatchChat(matchId) : Promise.resolve(false),
  ]);

  const viewerGender = viewerJoinProfile?.gender ?? null;
  const viewerDisplayName = viewerJoinProfile?.displayName ?? "Joueur";
  const canAccessChat = Boolean(chatAccess);

  let chatMessages: Awaited<ReturnType<typeof fetchMatchMessages>> = [];
  let participantNames: Record<string, string> = {};
  if (user && canAccessChat) {
    [chatMessages, participantNames] = await Promise.all([
      fetchMatchMessages(matchId),
      fetchMatchParticipantNames(matchId, match.created_by),
    ]);
  }

  const racketOffered = clubDetails ? isRacketRentalOfferedByClub(clubDetails) : false;
  const racketUnitPrice =
    racketOffered && clubDetails?.racket_rental_price_per_unit != null
      ? Number(clubDetails.racket_rental_price_per_unit)
      : 0;

  let canRecordResult = false;
  let teamRatings: { teamA: number; teamB: number } | null = null;

  if (user && !matchResult && match.status !== "played") {
    const isCreator = match.created_by === user.id;
    const isParticipant = activeParticipants.some((participant) => participant.player_id === user.id);

    if (isCreator || isParticipant) {
      canRecordResult = true;
      teamRatings = await fetchMatchTeamRatings(matchId);
    } else if (match.club_id) {
      const staffGuard = await assertClubStaffCanManage(supabase, match.club_id, user.id);
      canRecordResult = staffGuard.ok;
      if (canRecordResult) {
        teamRatings = await fetchMatchTeamRatings(matchId);
      }
    }
  }

  const typeLabels: Record<string, string> = {
    all: labels.matchTypeLabelAll,
    men_only: labels.matchTypeLabelMenOnly,
    women_only: labels.matchTypeLabelWomenOnly,
    mixed: labels.matchTypeLabelMixed,
  };

  const matchStarted = isMatchStarted(match.starts_at);

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
    matchStarted:
      locale === "en"
        ? "This match has already started — team changes are no longer allowed."
        : "Ce match a déjà commencé — changement d'équipe impossible.",
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
      <Link href={`/${locale}/play-now`} className="text-sm text-[var(--gold)] font-medium">
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

      <MatchTeamsRoster
        locale={locale}
        participants={participantProfiles}
        viewerId={user?.id ?? null}
      />

      {user ? (
        <>
          <MatchJoinActions
            locale={locale}
            matchId={match.id}
            matchType={match.match_gender_type}
            viewerGender={viewerGender}
            viewerId={user.id}
            participationPhase={participationPhase}
            viewerTeam={viewerTeam}
            sharePrice={sharePrice}
            clubName={match.clubName}
            walletBalance={walletBalance}
            walletHref={`/${locale}/profile/wallet`}
            isOpen={match.status === "open"}
            matchStarted={matchStarted}
            teamACount={teamA.length}
            teamBCount={teamB.length}
            participants={participantProfiles}
            racketUnitPrice={racketUnitPrice}
            labels={joinLabels}
          />
          {participationPhase === "confirmed" &&
          match.status === "open" &&
          teamA.length + teamB.length < 4 ? (
            <MatchShareInvitePanel
              locale={locale}
              matchId={match.id}
              clubName={match.clubName}
              spotsLeft={4 - teamA.length - teamB.length}
            />
          ) : null}
        </>
      ) : (
        <p className="text-sm text-white/70">
          <Link href={`/${locale}/auth/sign-in`} className="text-[var(--gold)] font-bold underline">
            {locale === "en" ? "Sign in" : "Connecte-toi"}
          </Link>{" "}
          {locale === "en" ? "to join this match." : "pour rejoindre ce match."}
        </p>
      )}

      {user && canAccessChat ? (
        <MatchChatPanel
          locale={locale}
          matchId={match.id}
          currentUserId={user.id}
          currentUserName={viewerDisplayName}
          initialMessages={chatMessages}
          participantNames={participantNames}
        />
      ) : null}

      {matchResult ? (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
          <h2 className="text-sm font-bold text-emerald-100">
            {locale === "en" ? "Final score" : "Score final"}
          </h2>
          <p className="text-sm text-white">
            {locale === "en" ? "Winner" : "Vainqueur"} :{" "}
            <span className="font-bold text-emerald-300">Équipe {matchResult.winnerTeam}</span>
          </p>
          {matchResult.setScores?.length ? (
            <p className="text-xs text-white/70">{formatSetScores(matchResult.setScores)}</p>
          ) : null}
          <p className="text-[10px] text-white/50">
            {locale === "en"
              ? "ELO updated for all players."
              : "Le classement ELO des joueurs a été mis à jour."}
          </p>
        </section>
      ) : canRecordResult ? (
        <section className="rounded-2xl border border-white/10 p-4 space-y-3 bg-surface-elevated">
          <h2 className="text-sm font-bold text-white">
            {locale === "en" ? "Enter the score" : "Saisir le score"}
          </h2>
          <MatchScoreForm locale={locale} matchId={match.id} teamRatings={teamRatings} />
        </section>
      ) : null}
    </div>
  );
}
