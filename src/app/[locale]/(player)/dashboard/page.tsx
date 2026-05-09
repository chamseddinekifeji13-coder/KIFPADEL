import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { playerService } from "@/modules/players/service";
import { fetchBookingsForPlayer } from "@/modules/bookings/repository";
import { Trophy, Calendar, User, LayoutDashboard, Shield } from "lucide-react";
import Link from "next/link";

import { ProfileStatsGrid } from "@/components/features/players/profile-stats-grid";
import { TopRivals } from "@/components/features/players/top-rivals";
import { clubService } from "@/modules/clubs/service";
import { getSuperAdminActor } from "@/modules/admin/actor";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function bookingStatusLabel(status: string, dictionaryLabels: Record<string, string>) {
  const statusLabels = {
    confirmed: dictionaryLabels.statusConfirmed,
    pending: dictionaryLabels.statusPendingPayment,
    expired: dictionaryLabels.statusExpired,
    cancelled: dictionaryLabels.statusCancelled,
    completed: dictionaryLabels.statusCompleted,
    no_show: dictionaryLabels.statusNoShow,
  } as const;
  return statusLabels[status as keyof typeof statusLabels] ?? status;
}

function bookingStatusClasses(status: string) {
  if (status === "confirmed") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  if (status === "pending") return "bg-amber-500/15 text-amber-300 border-amber-400/20";
  if (status === "expired") return "bg-rose-500/15 text-rose-300 border-rose-400/20";
  if (status === "cancelled") return "bg-slate-500/20 text-slate-300 border-slate-400/20";
  return "bg-slate-500/15 text-slate-200 border-slate-400/20";
}

export default async function PlayerDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  
  const user = await requireUser({ locale, redirectPath: "dashboard" });
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  
  const supabase = await createSupabaseServerClient();

  const [profile, bookings, topRivals, managedClub, superAdminActor] = await Promise.all([
    playerService.getPlayerProfile(user.id),
    fetchBookingsForPlayer(user.id, 5),
    playerService.getTopRivals(user.id, 3),
    clubService.getManagedClub(user.id),
    getSuperAdminActor(supabase),
  ]);

  if (!profile) redirect(`/${locale}/onboarding`);

  const upcomingBooking =
    bookings.find((booking) => new Date(booking.ends_at).getTime() >= new Date().getTime()) ?? null;

  const stats = [
    { label: "ELO sport", value: String(profile.sport_rating) },
    { label: "Confiance", value: `${profile.trust_score}/100` },
    { label: "Ligue", value: profile.league },
  ];

  const displayName = profile.display_name.includes("@")
    ? profile.display_name.split("@")[0]
    : profile.display_name;

  return (
    <div className="flex flex-col items-center w-full min-h-screen pb-32 animate-fade-in pt-8 px-4 sm:px-6 lg:px-8">
      {/* Centered Logo - Constant across devices */}
      <div className="flex flex-col items-center gap-3 mb-12">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl glass-gold p-2 shadow-premium group">
          <Image 
            src="/icons/icon.svg" 
            alt="KIFPADEL" 
            width={64}
            height={64}
            className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        <div className="text-center">
          <h2 className="text-[10px] font-black tracking-[0.4em] text-gold uppercase leading-none">KIFPADEL</h2>
          <p className="text-[8px] font-bold text-foreground-muted uppercase tracking-[0.2em] mt-1">Premium Club</p>
        </div>
      </div>

      {/* Hero section: Name and ELO - Responsive text size */}
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter sm:text-7xl lg:text-8xl">
          {displayName}
        </h1>
        <p className="text-xl font-black text-gold uppercase tracking-[0.15em] flex items-center justify-center gap-2 sm:text-2xl lg:text-3xl">
          ELO sport: <span className="text-white">{profile.sport_rating}</span>
        </p>
        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
          Confiance club (trust) · {profile.trust_score}/100 · {profile.reliability_status ?? profile.reliability}
        </p>
      </div>

      {/* Responsive Content Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Left/Main Column: Stats & Rivals */}
        <div className="lg:col-span-7 space-y-12 flex flex-col items-center">
          <div className="w-full max-w-md lg:max-w-none">
            <ProfileStatsGrid items={stats} />
          </div>

          {/* Upcoming Booking (Premium Mini Card) */}
          {upcomingBooking && (
            <Card className="w-full max-w-md border-gold/30 bg-gold/5 p-5 rounded-[2rem] flex items-center justify-between shadow-gold/10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gold uppercase tracking-widest">{labels.upcomingBookingTitle}</p>
                <p className="text-sm font-bold text-white truncate max-w-[200px]">{upcomingBooking.club_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-white">
                  {new Date(upcomingBooking.starts_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </p>
                <span className={`text-[9px] font-bold uppercase tracking-tight ${bookingStatusClasses(upcomingBooking.status)}`}>
                  {bookingStatusLabel(upcomingBooking.status, labels)}
                </span>
              </div>
            </Card>
          )}

          <div className="w-full max-w-sm lg:max-w-md">
            <TopRivals rivals={topRivals.map((r) => ({ name: r.name, wins: r.wins, losses: r.losses, encounters: r.encounters }))} />
          </div>
        </div>

        {/* Right/Side Column: Navigation & Actions */}
        <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-8 flex flex-col items-center">
          <div className="w-full max-w-sm space-y-6">
            <h3 className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.3em] text-center lg:text-left mb-6">Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link href={`/${locale}/play-now`} className="flex flex-col items-center gap-4 p-6 glass-gold rounded-[2rem] hover:bg-gold hover:text-black transition-all group active:scale-95 shadow-lg">
                <Trophy className="h-8 w-8" />
                <span className="text-[11px] font-black uppercase tracking-widest">Jouer</span>
              </Link>
              <Link href={`/${locale}/book`} className="flex flex-col items-center gap-4 p-6 glass rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all active:scale-95">
                <Calendar className="h-8 w-8" />
                <span className="text-[11px] font-black uppercase tracking-widest">Réserver</span>
              </Link>
            </div>

            {superAdminActor ? (
              <Link
                href={`/${locale}/admin`}
                className="flex w-full items-center justify-between gap-3 rounded-[1.75rem] border border-violet-500/25 bg-violet-950/40 p-5 text-left shadow-lg shadow-violet-950/20 transition-colors hover:bg-violet-900/50"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">{labels.dashboardSuperAdminTitle}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-300">
                  <Shield className="h-4 w-4" aria-hidden />
                  {labels.dashboardSuperAdminCta}
                </span>
              </Link>
            ) : null}

            {managedClub ? (
              <Link
                href={`/${locale}/club/dashboard`}
                className="flex w-full items-center justify-between gap-3 rounded-[1.75rem] border border-gold/30 bg-gold/5 p-5 text-left shadow-gold/10 transition-colors hover:bg-gold/15"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gold">{labels.dashboardClubTitle}</p>
                  <p className="truncate text-sm font-bold text-white">{managedClub.name}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gold">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  {labels.dashboardClubCta}
                </span>
              </Link>
            ) : null}
            
            <Link 
              href={`/${locale}/profile`}
              className="flex items-center justify-center gap-3 p-4 text-xs font-black text-foreground-muted uppercase tracking-[0.2em] hover:text-white transition-colors glass rounded-2xl"
            >
              <User className="h-4 w-4" />
              Mon Profil Complet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
