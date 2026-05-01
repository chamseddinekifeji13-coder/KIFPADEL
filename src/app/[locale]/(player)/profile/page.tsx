import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { playerService } from "@/modules/players/service";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { PlayerProfileCard } from "@/components/features/players/player-profile-card";
import { TrustScoreCard } from "@/components/features/players/trust-score-card";
import { ProfileStatsGrid } from "@/components/features/players/profile-stats-grid";
import { TopRivals } from "@/components/features/players/top-rivals";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "My Profile" : "Mon Profil";
  const description = isEn
    ? "Your premium KIFPADEL player card with ELO ranking, trust score, and match statistics."
    : "Votre carte joueur KIFPADEL premium avec classement ELO, score de confiance et statistiques de matchs.";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/profile` },
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `/${locale}/profile` },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch (err) {
    rethrowFrameworkError(err);
    userId = null;
  }

  if (!userId) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/profile`);
  }

  let profile: Awaited<ReturnType<typeof playerService.getPlayerProfile>> | null = null;
  try {
    profile = await playerService.getPlayerProfile(userId);
  } catch (err) {
    rethrowFrameworkError(err);
    profile = null;
  }
  if (!profile) notFound();

  const displayName = profile.display_name ?? "Joueur";
  const league = profile.league ?? "Bronze";
  const trustScore = Number.isFinite(profile.trust_score) ? profile.trust_score : 70;
  const reliabilityStatus = profile.reliability_status ?? "healthy";
  
  // Mock stats - would come from actual match data
  const playerStats = {
    matchesPlayed: 24,
    wins: 18,
    winRate: 75,
    eloRank: 1850,
    weeklyMatches: 3,
  };

  // Mock rivals data
  const topRivals = [
    { name: "Ahmed B.", matchesVs: 5, wins: 3, losses: 2, eloVs: 1920 },
    { name: "Youssef K.", matchesVs: 4, wins: 2, losses: 2, eloVs: 1870 },
    { name: "Sarah M.", matchesVs: 6, wins: 4, losses: 2, eloVs: 1795 },
    { name: "Mehdi T.", matchesVs: 3, wins: 1, losses: 2, eloVs: 1650 },
    { name: "Ines L.", matchesVs: 2, wins: 2, losses: 0, eloVs: 1920 },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen py-8 px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Premium Player Card */}
        <PlayerProfileCard
          displayName={displayName}
          league={league}
          eloRank={playerStats.eloRank}
          memberId={userId.slice(0, 8).toUpperCase()}
        />

        {/* Stats Grid */}
        <ProfileStatsGrid
          matchesPlayed={playerStats.matchesPlayed}
          wins={playerStats.wins}
          winRate={playerStats.winRate}
          weeklyMatches={playerStats.weeklyMatches}
        />

        {/* Trust Score Section */}
        <TrustScoreCard
          trustScore={trustScore}
          reliabilityStatus={reliabilityStatus}
          locale={locale}
        />

        {/* Top Rivals */}
        <TopRivals rivals={topRivals} />

        {/* Padding for nav */}
        <div className="h-24" />
      </div>
    </div>
  );
}
