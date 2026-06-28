import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth/guards/require-user";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { signOutAction } from "@/modules/auth/actions/sign-out";
import { playerService } from "@/modules/players/service";
import { clubService } from "@/modules/clubs/service";
import { getSuperAdminActor } from "@/modules/admin/actor";
import { fetchBookingsForPlayer } from "@/modules/bookings/repository";
import { fetchRecentTournamentSummariesForPlayer } from "@/modules/tournaments/repository";
import { Player } from "@/modules/players/repository";
import { LeagueProgress } from "@/components/features/players/league-progress";
import { playerCategoryBadgeVariant } from "@/domain/rules/player-category";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Trophy, 
  ShieldCheck, 
  CreditCard, 
  Settings, 
  ChevronRight, 
  History,
  LogOut,
  Star,
  LayoutDashboard,
  Shield,
  Medal,
} from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";
import { RatingHistoryPanel } from "@/components/features/players/rating-history-panel";
import {
  fetchPlayerMatchStats,
  fetchPlayerRatingEvents,
} from "@/modules/rating/repository";
import { SponsorPartnersStrip } from "@/components/features/sponsors/sponsor-partners-strip";
import { listActiveSponsorsForPublic } from "@/modules/sponsors/repository";
import { Avatar } from "@/components/ui/avatar";
import { AccountVerifiedCelebration } from "@/components/features/players/account-verified-celebration";
import { buildAccountVerifiedCelebrationLabels } from "@/components/features/players/account-verified-celebration-labels";
import { PlayerReferralPanel } from "@/components/features/players/player-referral-panel";
import { publicEnv } from "@/lib/config/env";
import { buildReferralSignUpUrl } from "@/lib/referrals/referral-url";
import { PwaInstallPanel } from "@/components/features/pwa/pwa-install-panel";
import { buildPwaInstallLabels } from "@/lib/pwa/labels";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verified?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { locale } = await params;
  const { verified } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const labels = dictionary.player;

  const user = await requireUser({ locale, redirectPath: "profile" });
  const supabase = await createSupabaseServerClient();

  let profile: Player | null = null;
  try {
    profile = await playerService.getPlayerProfile(user.id);
  } catch (err) {
    rethrowFrameworkError(err);
    console.error("Failed to fetch profile:", err);
  }

  if (!profile) {
    redirect(`/${locale}/onboarding`);
  }

  const { data: phoneRow } = await supabase
    .from("profiles")
    .select("phone_verified_at")
    .eq("id", user.id)
    .maybeSingle();
  const phoneVerified = Boolean(phoneRow?.phone_verified_at);

  const [topRivals, bookings, recentTournaments, managedClub, superAdminActor, sponsors, ratingEvents, matchStats] =
    await Promise.all([
      playerService.getTopRivals(user.id, 3).catch(() => []),
      fetchBookingsForPlayer(user.id, 20).catch(() => []),
      fetchRecentTournamentSummariesForPlayer(user.id, 5).catch(() => []),
      clubService.getManagedClub(user.id).catch(() => null),
      getSuperAdminActor(supabase).catch(() => null),
      listActiveSponsorsForPublic().catch(() => []),
      fetchPlayerRatingEvents(user.id, 10).catch(() => []),
      fetchPlayerMatchStats(user.id).catch(() => null),
    ]);
  const completedCount = bookings.filter((booking) => booking.status === "completed").length;
  const cancelledCount = bookings.filter((booking) => booking.status === "cancelled").length;
  const showAccountVerifiedCelebration = phoneVerified && verified === "1";
  const celebrationLabels = showAccountVerifiedCelebration
    ? buildAccountVerifiedCelebrationLabels(labels, profile.display_name)
    : null;
  const referralSignUpUrl = buildReferralSignUpUrl(publicEnv.siteUrl, locale, user.id);

  return (
    <div className="flex-1 p-4 space-y-8 pb-20">
      {showAccountVerifiedCelebration && celebrationLabels ? (
        <AccountVerifiedCelebration locale={locale} labels={celebrationLabels} />
      ) : null}

      {!phoneVerified ? (
        <Link
          href={`/${locale}/profile/verify-phone?next=/${locale}/book`}
          className="block rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4"
        >
          <p className="text-sm font-bold text-[var(--warning)]">{labels.verifyPhoneBannerTitle}</p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">{labels.verifyPhoneBannerSubtitle}</p>
          <span className="mt-3 inline-flex text-xs font-bold text-[var(--gold)]">{labels.verifyPhoneBannerCta} →</span>
        </Link>
      ) : null}

      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">{labels.profileTitle}</h1>
        <a
          href="#account-settings"
          aria-label={labels.profileSettingsAria}
          className="tap-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors touch-manipulation"
        >
          <Settings className="h-5 w-5" />
        </a>
      </header>


      {/* Virtual Member Card */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[var(--surface)] border border-[var(--gold)]/20 p-5 sm:p-6 flex flex-col gap-4 text-white shadow-2xl shadow-black/20 group min-h-[240px]">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gold)] rounded-full blur-[90px] opacity-10 -mr-20 -mt-20 group-hover:opacity-20 transition-opacity" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-[70px] opacity-5 -ml-20 -mb-20" />
        
        <div className="relative flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/profile/edit`}
                className="rounded-full ring-2 ring-white/20 transition-opacity hover:opacity-90"
                aria-label={labels.profileAvatarTitle}
              >
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fallback={profile.display_name.charAt(0)}
                  size="lg"
                  className="h-14 w-14 border-2 border-white/20 bg-white/10"
                />
              </Link>
              <div className="h-8 w-8 bg-white/10 rounded-lg backdrop-blur-md flex items-center justify-center border border-white/10">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{labels.profileCardRoleLabel}</p>
              <h2 className="text-xl font-bold">{profile.display_name}</h2>
            </div>
          </div>
          <Badge
            variant={
              playerCategoryBadgeVariant(profile.leagueCategory ?? profile.league) as BadgeProps["variant"]
            }
            className="border-white/20 backdrop-blur-sm px-4 py-1.5 uppercase tracking-wider"
          >
            {profile.league}
          </Badge>
        </div>

        <div className="relative grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{labels.profileCardIdLabel}</p>
            <p className="text-sm font-bold text-white">KIF-2026</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-emerald-300/70 font-bold">{labels.reliabilityLabel}</p>
            <p className="text-sm font-bold text-emerald-300">{profile.trust_score}/100</p>
          </div>
        </div>

        <div className="relative">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {labels.reliabilityLabel}
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">{profile.reliability_status}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Trust {profile.trust_score}/100</p>
            {profile.gender ? (
              <p className="text-xs text-slate-400 font-medium">
                Genre · {profile.gender === "male" ? "Homme" : "Femme"}
              </p>
            ) : (
              <p className="text-xs text-amber-400/90 font-medium">
                Genre non renseigné — nécessaire pour certains matchs
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Progression */}
      <Card className="p-6 space-y-6 bg-[var(--surface)] border-[var(--border)]">
        <SectionTitle 
          title={labels.rankingSectionTitle}
          icon={<Trophy className="h-4 w-4" />}
          className="bg-transparent p-0"
        />
        <LeagueProgress 
          sportRating={profile.sport_rating} 
          currentLeague={profile.league} 
        />
      </Card>

      <Card className="p-6 space-y-4 bg-[var(--surface)] border-[var(--border)]">
        <SectionTitle
          title="Historique ELO"
          icon={<History className="h-4 w-4" />}
          className="bg-transparent p-0"
        />
        <RatingHistoryPanel locale={locale} events={ratingEvents} stats={matchStats} />
      </Card>

      {/* Stats Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center gap-2 bg-[var(--surface)] border-[var(--border)]">
          <div className="h-10 w-10 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
            <Star className="h-5 w-5 fill-[var(--gold)]" />
          </div>
          <span className="text-xs font-bold text-white">{labels.completedSessionsLabel}</span>
          <span className="text-lg font-black text-[var(--gold)]">{completedCount}</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center gap-2 bg-[var(--surface)] border-[var(--border)]">
          <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-300 flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-white">{labels.cancelledBookingsLabel}</span>
          <span className="text-lg font-black text-rose-300">{cancelledCount}</span>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle title={labels.topRivalsTitle} className="text-sm opacity-80 px-2 text-white" />
        <div className="space-y-2">
          {topRivals.length === 0 ? (
            <Card className="p-4 bg-[var(--surface)] border-[var(--border)] text-sm text-[var(--foreground-muted)]">
              {labels.topRivalsEmpty}
            </Card>
          ) : (
            topRivals.map((rival) => (
              <Card key={rival.userId} className="p-4 bg-[var(--surface)] border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{rival.name}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {rival.encounters} {labels.rivalEncountersLabel}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title={labels.profileRecentTournamentsTitle}
          icon={<Trophy className="h-4 w-4" />}
          className="text-sm opacity-80 px-2 text-white"
        />
        {recentTournaments.length === 0 ? (
          <Card className="p-4 bg-[var(--surface)] border-[var(--border)] space-y-3">
            <p className="text-sm text-[var(--foreground-muted)]">{labels.profileRecentTournamentsEmpty}</p>
            <Link
              href={`/${locale}/tournaments`}
              className="inline-flex text-xs font-bold text-[var(--gold)] hover:underline"
            >
              {labels.profileBrowseTournamentsCta} →
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentTournaments.map((t, index) => (
              <Card
                key={`${t.tournamentId}-${index}`}
                className="p-4 bg-[var(--surface)] border-[var(--border)]"
              >
                <Link href={`/${locale}/tournaments/${t.tournamentId}`} className="block group">
                  <p className="text-sm font-bold text-white group-hover:text-[var(--gold)]">{t.title}</p>
                  <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                    {t.clubName}
                    {t.status ? ` · ${t.status}` : ""}
                  </p>
                  <p className="text-xs text-slate-300 mt-1.5">{t.placementLabel}</p>
                </Link>
              </Card>
            ))}
            <Link
              href={`/${locale}/tournaments`}
              className="block text-center text-xs font-bold text-[var(--gold)] py-2 hover:underline"
            >
              {labels.profileBrowseTournamentsCta} →
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle
          title={labels.profileRecentLeaguesTitle}
          icon={<Medal className="h-4 w-4" />}
          className="text-sm opacity-80 px-2 text-white"
        />
        <Card className="p-4 bg-[var(--surface)] border-[var(--border)] space-y-3">
          <p className="text-sm text-[var(--foreground-muted)]">{labels.profileRecentLeaguesEmpty}</p>
          <Link
            href={`/${locale}/leagues`}
            className="inline-flex text-xs font-bold text-[var(--gold)] hover:underline"
          >
            {labels.profileBrowseLeaguesCta} →
          </Link>
        </Card>
      </section>

      <PlayerReferralPanel
        locale={locale}
        displayName={profile.display_name}
        signUpUrl={referralSignUpUrl}
        labels={{
          title: labels.referralTitle,
          subtitle: labels.referralSubtitle,
          previewTitle: labels.referralPreviewTitle,
          copyCta: labels.referralCopyCta,
          whatsappCta: labels.referralWhatsappCta,
          shareCta: labels.referralShareCta,
          copiedToast: labels.referralCopiedToast,
        }}
      />

      <SponsorPartnersStrip
        sponsors={sponsors}
        title={dictionary.common.sponsorsPartnersTitle}
      />

      <PwaInstallPanel labels={buildPwaInstallLabels(labels)} />

      {/* Account Settings List */}
      <section id="account-settings" className="scroll-mt-[calc(5rem+env(safe-area-inset-top,0px))] space-y-3">
        <SectionTitle title={labels.accountSettingsTitle} className="text-sm opacity-50 px-2" />
        <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] divide-y divide-[var(--border)] shadow-sm overflow-hidden">
          
          {/* Super Admin Access */}
          {superAdminActor && (
            <Link
              href={`/${locale}/admin`}
              className="tap-target w-full min-h-12 p-4 flex items-center justify-between hover:bg-violet-500/10 transition-colors group touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-violet-400 group-hover:text-violet-300 transition-colors" />
                <span className="text-sm font-bold text-violet-300 group-hover:text-violet-200">
                  {labels.accountSuperAdmin}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
            </Link>
          )}

          {/* Club Dashboard Access */}
          {managedClub && (
            <Link
              href={`/${locale}/club/dashboard`}
              className="tap-target w-full min-h-12 p-4 flex items-center justify-between hover:bg-[var(--gold)]/10 transition-colors group touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4 text-[var(--gold)] group-hover:text-[var(--gold-dark)] transition-colors" />
                <span className="text-sm font-bold text-[var(--gold)] group-hover:text-[var(--gold-dark)]">
                  {labels.accountClubDashboard}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
            </Link>
          )}

          {/* Standard Settings */}
          {/* Standard Settings */}
          {[
            ...(phoneVerified
              ? []
              : [{ label: labels.accountVerifyPhone, href: `/${locale}/profile/verify-phone` }]),
            { label: labels.accountTournaments, href: `/${locale}/tournaments` },
            { label: labels.accountLeagues, href: `/${locale}/leagues` },
            { label: labels.accountPersonalInfo, href: `/${locale}/profile/edit` },
            { label: labels.kifWalletTitle, href: `/${locale}/profile/wallet` },
            { label: labels.accountNotifications, href: `/${locale}/profile/notifications` },
            { label: labels.accountSupport, href: `/${locale}/support` },
          ].map((item) => (
            <Link 
              key={item.label} 
              href={item.href} 
              className="tap-target w-full min-h-12 p-4 flex items-center justify-between hover:bg-[var(--surface-elevated)] transition-colors group touch-manipulation"
            >
              <span className="text-sm font-bold text-slate-200 group-hover:text-white pl-7">
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
            </Link>
          ))}

          {/* Sign Out */}
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button 
              className="tap-target w-full min-h-12 p-4 flex items-center justify-between hover:bg-red-500/10 transition-colors group touch-manipulation" 
              type="submit"
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-300 transition-colors" />
                <span className="text-sm font-bold text-red-400 group-hover:text-red-300">
                  {dictionary.auth.signOutCta}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-red-400/50" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
