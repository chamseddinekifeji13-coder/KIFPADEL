import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { playerService } from "@/modules/players/service";
import { fetchBookingsForPlayer } from "@/modules/bookings/repository";
import { Trophy, Calendar, User } from "lucide-react";
import Link from "next/link";

import { ProfileStatsGrid } from "@/components/features/players/profile-stats-grid";
import { TopRivals } from "@/components/features/players/top-rivals";

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
  
  const [profile, bookings] = await Promise.all([
    playerService.getPlayerProfile(user.id),
    fetchBookingsForPlayer(user.id, 5),
  ]);

  if (!profile) redirect(`/${locale}/onboarding`);

  const now = Date.now();
  const upcomingBooking =
    bookings.find((booking) => new Date(booking.ends_at).getTime() >= now) ?? null;

  const stats = [
    { label: "Win Rate", value: "68%" },
    { label: "Matchs", value: "12" }, // TODO: Fetch real match count
    { label: "Streak", value: "4 Wins" },
  ];

  const dummyRivals = [
    { name: "Sami B.", wins: 3, losses: 1, encounters: 1620 },
    { name: "Mehdi K.", wins: 2, losses: 2, encounters: 1580 },
    { name: "Omar T.", wins: 4, losses: 0, encounters: 1550 },
  ];

  return (
    <div className="flex flex-col items-center w-full min-h-screen space-y-10 pb-32 animate-fade-in pt-8 px-4">
      {/* Centered Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl glass-gold p-2 shadow-premium group">
          <img 
            src="/icons/icon.svg" 
            alt="KIFPADEL" 
            className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        <div className="text-center">
          <h2 className="text-[10px] font-black tracking-[0.4em] text-gold uppercase leading-none">KIFPADEL</h2>
          <p className="text-[8px] font-bold text-foreground-muted uppercase tracking-[0.2em] mt-1">Premium Club</p>
        </div>
      </div>

      {/* Player Identity - LARGE & CENTERED */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter sm:text-6xl">
          {profile.display_name}
        </h1>
        <p className="text-lg font-black text-gold uppercase tracking-[0.15em] flex items-center justify-center gap-2">
          ELO RANK: <span className="text-white">{profile.trust_score * 15 + 800}</span>
        </p>
      </div>

      {/* Stats Grid - 3 Columns */}
      <div className="w-full max-w-sm">
        <ProfileStatsGrid items={stats} />
      </div>

      {/* Upcoming Booking (Premium Mini Card) */}
      {upcomingBooking && (
        <Card className="w-full max-w-sm border-gold/30 bg-gold/5 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-gold uppercase tracking-widest">{labels.upcomingBookingTitle}</p>
            <p className="text-xs font-bold text-white truncate max-w-[180px]">{upcomingBooking.club_name}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white">
              {new Date(upcomingBooking.starts_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </p>
            <span className={`text-[8px] font-bold uppercase tracking-tight ${bookingStatusClasses(upcomingBooking.status)}`}>
              {bookingStatusLabel(upcomingBooking.status, labels)}
            </span>
          </div>
        </Card>
      )}

      {/* Top Rivals - Minimalist List */}
      <div className="w-full max-w-xs">
        <TopRivals rivals={dummyRivals} />
      </div>

      {/* Navigation Actions - Subtle below */}
      <div className="w-full max-w-xs pt-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Link href={`/${locale}/play-now`} className="flex flex-col items-center gap-3 p-5 glass-gold rounded-3xl hover:bg-gold hover:text-black transition-all group active:scale-95">
            <Trophy className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Jouer</span>
          </Link>
          <Link href={`/${locale}/book`} className="flex flex-col items-center gap-3 p-5 glass rounded-3xl border border-white/5 hover:bg-white/10 transition-all active:scale-95">
            <Calendar className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Réserver</span>
          </Link>
        </div>
        <Link 
          href={`/${locale}/profile`}
          className="flex items-center justify-center gap-2 p-3 text-[10px] font-black text-foreground-muted uppercase tracking-widest hover:text-white transition-colors"
        >
          <User className="h-4 w-4" />
          Mon Profil
        </Link>
      </div>
    </div>
  );
}
