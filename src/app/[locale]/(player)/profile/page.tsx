import type { Metadata } from "next";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { playerService } from "@/modules/players/service";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { ChevronLeft, Trophy, Target, Zap, Calendar, Heart, Shield, TrendingUp } from "lucide-react";

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

  // Demo mode: show profile without auth for preview
  const isDemo = !userId;
  
  let profile: Awaited<ReturnType<typeof playerService.getPlayerProfile>> | null = null;
  if (userId) {
    try {
      profile = await playerService.getPlayerProfile(userId);
    } catch (err) {
      rethrowFrameworkError(err);
      profile = null;
    }
  }

  const displayName = profile?.display_name ?? "AHMED BENALI";
  const trustScore = Number.isFinite(profile?.trust_score) ? profile.trust_score : 85;
  const reliabilityStatus = profile?.reliability_status ?? "healthy";

  // Mock stats
  const playerStats = {
    matchesPlayed: 24,
    wins: 18,
    losses: 6,
    winRatio: "75%",
    currentStreak: 4,
    presence: "92%",
    trustScore: trustScore,
    eloRank: 1850,
  };

  const topRivals = [
    { name: "Ahmed B.", record: "3-2" },
    { name: "Youssef K.", record: "2-2" },
    { name: "Sarah M.", record: "4-2" },
    { name: "Mehdi T.", record: "1-2" },
    { name: "Ines L.", record: "2-0" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="w-full max-w-lg mx-auto space-y-8">
        
        {/* Top Header - KIFPADEL Logo */}
        <header className="flex items-center justify-between">
          <Link 
            href={`/${locale}`}
            className="flex items-center gap-2 text-[var(--foreground-muted)] hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wider">Accueil</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg bg-[var(--gold)] flex items-center justify-center">
              <span className="text-black font-black text-[10px]">KIF</span>
            </div>
            <span className="text-[var(--gold)] font-black text-sm tracking-tight uppercase">PADEL</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Hero: Player Name + ELO Rank */}
        <div className="space-y-4 text-center">
          <div>
            <p className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-[0.15em] mb-2">
              Profil Joueur
            </p>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight text-balance">
              {displayName}
            </h1>
          </div>
          
          <div className="inline-flex items-baseline gap-3 mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl px-5 py-3">
            <span className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-[0.1em]">
              ELO Rank:
            </span>
            <span className="text-3xl font-black text-[var(--gold)] font-mono tracking-tighter">
              {playerStats.eloRank.toString().padStart(4, "0")}
            </span>
          </div>
        </div>

        {/* Stats Grid - 7 Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Matchs", value: playerStats.matchesPlayed, icon: Trophy },
            { label: "Victoires", value: playerStats.wins, icon: Target },
            { label: "Défaites", value: playerStats.losses, icon: TrendingUp },
            { label: "Ratio", value: playerStats.winRatio, icon: Zap },
            { label: "Série", value: playerStats.currentStreak, icon: Calendar },
            { label: "Présence", value: playerStats.presence, icon: Heart },
            { label: "Confiance", value: playerStats.trustScore, icon: Shield },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2"
            >
              <stat.icon className="h-5 w-5 text-[var(--gold)]" />
              <span className="text-2xl font-black text-white">{stat.value}</span>
              <span className="text-[8px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Top Rivals Section */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-[var(--gold)] uppercase tracking-[0.2em]">
            Top Rivaux
          </h3>
          <div className="space-y-2">
            {topRivals.map((rival, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 px-2 border-b border-[var(--border)] last:border-0"
              >
                <p className="text-sm font-bold text-white">{rival.name}</p>
                <p className="text-xs font-mono text-[var(--gold)]">{rival.record}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spacing for bottom nav */}
        <div className="h-20" />
      </div>
    </div>
  );
}
