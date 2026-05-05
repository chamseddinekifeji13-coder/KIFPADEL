import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { playerService } from "@/modules/players/service";
import { fetchBookingsForPlayer } from "@/modules/bookings/repository";
import { Trophy, Calendar, ShieldCheck, ChevronRight, User, Clock3, Users } from "lucide-react";
import Link from "next/link";

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
    fetchBookingsForPlayer(user.id, 10),
  ]);

  if (!profile) redirect(`/${locale}/onboarding`);

  const now = Date.now();
  const upcomingBooking =
    bookings.find((booking) => new Date(booking.ends_at).getTime() >= now) ?? null;

  return (
    <div className="space-y-6 pb-24 text-white">
      <header className="flex justify-between items-end py-2">
        <div>
          <p className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest">{labels.dashboardTitle}</p>
          <h1 className="text-2xl font-black text-white">{labels.dashboardGreeting}, {profile.display_name}</h1>
        </div>
        <Link 
          href={`/${locale}/profile`}
          aria-label={labels.dashboardProfileAria}
          className="h-10 w-10 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black transition-all"
        >
          <User className="h-5 w-5" />
        </Link>
      </header>

      {/* Next booking spotlight */}
      {upcomingBooking ? (
        <Card className="border-[var(--gold)]/30 bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[var(--gold)] font-black">
                {labels.upcomingBookingTitle}
              </p>
              <h2 className="text-lg font-extrabold text-white">
                {upcomingBooking.club_name} · {upcomingBooking.court_label}
              </h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                {new Date(upcomingBooking.starts_at).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${bookingStatusClasses(upcomingBooking.status)}`}>
              {bookingStatusLabel(upcomingBooking.status, labels)}
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/${locale}/bookings`} className="inline-flex h-10 items-center rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20">
              {labels.viewBookingsCta}
            </Link>
            <Link href={`/${locale}/play-now`} className="inline-flex h-10 items-center rounded-xl bg-[var(--gold)] px-3 text-xs font-bold text-black hover:bg-[var(--gold-dark)]">
              {labels.joinOpenMatchCta}
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-bold text-white">
            {labels.noUpcomingBookingTitle}
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            {labels.noUpcomingBookingSubtitle}
          </p>
          <div className="mt-4 flex gap-2">
            <Link href={`/${locale}/book`} className="inline-flex h-10 items-center rounded-xl bg-[var(--gold)] px-3 text-xs font-bold text-black hover:bg-[var(--gold-dark)]">
              {labels.bookCourtCta}
            </Link>
            <Link href={`/${locale}/play-now`} className="inline-flex h-10 items-center rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20">
              {labels.openMatchesCta}
            </Link>
          </div>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-[var(--surface)] text-white border-[var(--border)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy className="h-12 w-12 text-[var(--gold)]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">{labels.levelLabel}</p>
          <p className="text-xl font-black text-[var(--gold)]">{profile.league}</p>
          <p className="text-[9px] mt-1 text-[var(--foreground-muted)]">{labels.levelHint}</p>
        </Card>

        <Card className="p-4 border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">{labels.reliabilityLabel}</p>
            <div className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              <span className="text-sm font-bold uppercase">{profile.reliability_status}</span>
            </div>
          </div>
          <p className="text-[9px] text-[var(--foreground-muted)]">{labels.trustScoreLabel}: {profile.trust_score}/100</p>
        </Card>
      </div>

      {/* Main Actions */}
      <section className="space-y-3">
        <h3 className="text-xs font-black text-[var(--foreground-muted)] uppercase tracking-widest px-1">
          {labels.actionsTitle}
        </h3>
        <div className="grid gap-3">
          <Link href={`/${locale}/play-now`} className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-[var(--gold)]/50 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)]">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{labels.actionJoinOpenMatchesTitle}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{labels.actionJoinOpenMatchesSubtitle}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--foreground-muted)] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href={`/${locale}/book`} className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-[var(--gold)]/50 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{labels.actionBookCourtTitle}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{labels.actionBookCourtSubtitle}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--foreground-muted)] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href={`/${locale}/find-players`} className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-[var(--gold)]/50 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{labels.actionFindPlayersTitle}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{labels.actionFindPlayersSubtitle}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--foreground-muted)] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href={`/${locale}/bookings`} className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-[var(--gold)]/50 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{labels.actionMyBookingsTitle}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{labels.actionMyBookingsSubtitle}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--foreground-muted)] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
