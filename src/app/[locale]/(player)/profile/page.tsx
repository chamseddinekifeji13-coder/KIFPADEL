import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { playerService } from "@/modules/players/service";
import { PlayerProfileCard } from "@/components/features/players/player-profile-card";
import { ProfileStatsGrid } from "@/components/features/players/profile-stats-grid";
import { TrustScoreCard } from "@/components/features/players/trust-score-card";
import { TopRivals } from "@/components/features/players/top-rivals";
import { requireUser } from "@/modules/auth/guards/require-user";

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

  const user = await requireUser({ locale, redirectPath: "profile" });

  const profile =
    (await playerService.getPlayerProfile(user.id)) ??
    ({
      display_name:
        (user.user_metadata?.display_name as string | undefined) ??
        user.email?.split("@")[0] ??
        "PLAYER",
      elo_rank: 1200,
      sport_rating: 1200,
      rating_value: 1200,
      matches_played: 0,
      matches_count: 0,
      wins_count: 0,
      wins: 0,
      losses_count: 0,
      losses: 0,
      current_streak: 0,
      presence_rate: 100,
      trust_score: 70,
      reliability_status: "healthy",
    } as const);

  const playerName = String(profile.display_name ?? "PLAYER");
  const eloRank = Number(
    profile.elo_rank ??
      profile.sport_rating ??
      profile.rating_value ??
      1200,
  );

  const matchesPlayed = Number(profile.matches_played ?? profile.matches_count ?? 0);
  const wins = Number(profile.wins_count ?? profile.wins ?? 0);
  const losses = Number(profile.losses_count ?? profile.losses ?? 0);
  const ratio = matchesPlayed > 0 ? `${Math.round((wins / matchesPlayed) * 100)}%` : "0%";
  const streak = Number(profile.current_streak ?? 0);
  const presence = Number(profile.presence_rate ?? 100);
  const trustScore = Number(profile.trust_score ?? 70);
  const reliabilityStatus = String(profile.reliability_status ?? "healthy");

  const statsItems = [
    { label: "MATCHES", value: String(matchesPlayed) },
    { label: "WINS", value: String(wins) },
    { label: "LOSSES", value: String(losses) },
    { label: "RATIO", value: ratio },
    { label: "STREAK", value: String(streak) },
    { label: "PRESENCE", value: `${presence}%` },
    { label: "TRUST", value: `${Math.max(0, Math.min(100, trustScore))}` },
  ];

  const topRivalsRaw = await playerService.getTopRivals(user.id, 3);
  const topRivals = topRivalsRaw.map((rival) => ({
    name: rival.name,
    wins: rival.wins,
    losses: rival.losses,
    encounters: rival.encounters,
  }));

  return (
    <div className="flex-1 bg-black px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-7">
        <PlayerProfileCard playerName={playerName} eloRank={eloRank} />

        <ProfileStatsGrid items={statsItems} />

        <TrustScoreCard
          trustScore={trustScore}
          reliabilityStatus={reliabilityStatus}
        />

        <TopRivals rivals={topRivals} />

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            Settings
          </p>
          <p className="mt-1 text-xs text-white/55">
            Les actions de compte restent secondaires sur cet écran.
          </p>
        </section>
      </div>
    </div>
  );
}
