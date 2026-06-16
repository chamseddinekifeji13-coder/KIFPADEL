import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { fetchCourtsByClub } from "@/modules/clubs/repository";
import {
  fetchClubSlotOperationRows,
  todayTunisYmd,
} from "@/modules/bookings/repository";
import { formatTunisHm } from "@/modules/bookings/timezone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Calendar,
  Activity,
  AlertTriangle,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

type ClubDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubDashboardPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: dictionary.club.dashboardMetaTitle,
    description: dictionary.club.dashboardMetaDescription,
  };
}

export default async function ClubDashboardPage({ params }: ClubDashboardPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.club;
  const user = await requireUser({ locale, redirectPath: "club/dashboard" });
  const managedClub = await clubService.getManagedClub(user.id);

  if (!managedClub) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-bold text-white">
          {labels.noClubAccessTitle}
        </h1>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">
          {labels.noClubAccessSubtitle}
        </p>
        <Link
          href={`/${locale}/clubs/new`}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--gold)] px-5 text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)]"
        >
          {labels.noClubCreateCta}
        </Link>
      </div>
    );
  }

  const todayDate = todayTunisYmd();
  const now = Date.now();

  const [participantRows, courtsRows] = await Promise.all([
    fetchClubSlotOperationRows(managedClub.id, todayDate),
    fetchCourtsByClub(managedClub.id),
  ]);

  const playerIds = [...new Set(participantRows.map((row) => row.player_id).filter(Boolean))];
  const supabase = await createSupabaseServerClient();
  const { data: players } = playerIds.length
    ? await supabase.from("profiles").select("id, display_name, trust_score").in("id", playerIds as string[])
    : { data: [] as { id: string; display_name: string | null; trust_score: number | null }[] };

  const playerById = new Map((players ?? []).map((player) => [player.id, player]));
  const courtLabelById = new Map(courtsRows.map((court) => [court.id, court.label]));

  const todaySlots = participantRows.map((row) => {
    const bookingRaw = row.bookings;
    const booking = Array.isArray(bookingRaw) ? bookingRaw[0] : bookingRaw;
    const player = playerById.get(row.player_id);
    const courtId = booking?.court_id ?? "";

    return {
      id: row.id,
      bookingId: row.booking_id,
      playerId: row.player_id,
      startsAt: booking?.starts_at ?? "",
      endsAt: booking?.ends_at ?? "",
      courtId,
      courtLabel:
        courtLabelById.get(courtId) ?? `${labels.fallbackCourtLabel} ${courtId.slice(0, 4)}`,
      status: row.status,
      paymentMethod: row.payment_method,
      displayName: player?.display_name ?? labels.genericPlayerName,
      trustScore: player?.trust_score ?? 0,
      createdAt: row.created_at,
    };
  });

  const pendingBookings = todaySlots.filter((slot) => slot.status === "pending");
  const stalePendingBookings = pendingBookings.filter(
    (slot) => now - new Date(slot.createdAt).getTime() > 15 * 60 * 1000,
  );
  const uniqueSessions = new Set(todaySlots.map((slot) => slot.bookingId)).size;
  const occupancyTrend =
    uniqueSessions === 0
      ? 0
      : Math.min(100, Math.round((todaySlots.length / (uniqueSessions * 4)) * 100));

  const noShowAlerts = todaySlots
    .filter((slot) => slot.status === "no_show")
    .map((slot) => ({
      id: slot.id,
      playerName: slot.displayName,
      trustScore: slot.trustScore,
      reason: "no_show",
    }));

  const lowTrustAlerts = todaySlots
    .filter((slot) => slot.trustScore < 60)
    .slice(0, 3)
    .map((slot) => ({
      id: slot.id,
      playerName: slot.displayName,
      trustScore: slot.trustScore,
      reason: "low_trust",
    }));

  const recentIncidents = [...noShowAlerts, ...lowTrustAlerts].slice(0, 5);

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{dictionary.club.dashboardTitle}</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          {managedClub.name} · {labels.operationalOverview}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={labels.kpiTodayBookings}
          value={todaySlots.length}
          icon={Calendar}
        />
        <StatCard
          label={labels.kpiOccupancyTrend}
          value={`${occupancyTrend}%`}
          icon={Activity}
          trend={occupancyTrend >= 70 ? labels.trendStable : labels.trendWatch}
          trendUp
        />
        <StatCard
          label={labels.kpiPendingBookings}
          value={pendingBookings.length}
          icon={Clock}
        />
        <StatCard
          label={labels.kpiExpiredPending}
          value={stalePendingBookings.length}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Today's Bookings */}
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-black/10">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-[var(--gold)]" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">{labels.todayBookingsTitle}</h2>
                <p className="text-[10px] text-[var(--foreground-muted)]">
                  {todaySlots.length} {labels.todayBookingsObserved}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/club/slots`}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:underline"
            >
              {labels.viewAllCta}
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {todaySlots.slice(0, 8).map((slot) => (
              <div key={slot.id} className="p-4 flex items-center gap-4 hover:bg-[var(--surface-elevated)] transition-colors">
                <div className="text-center min-w-[50px]">
                  <p className="text-sm font-bold text-white">
                    {slot.startsAt ? formatTunisHm(new Date(slot.startsAt)) : "--:--"}
                  </p>
                  <p className="text-[10px] text-[var(--foreground-muted)]">
                    {slot.endsAt ? formatTunisHm(new Date(slot.endsAt)) : "--:--"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">
                    {slot.displayName}
                  </p>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    {slot.courtLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {slot.paymentMethod === "online" ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
                      {labels.paymentOnline}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
                      {labels.paymentAtClub}
                    </span>
                  )}
                  {slot.status === "confirmed" ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  ) : slot.status === "pending" ? (
                    <Clock className="h-4 w-4 text-[var(--warning)]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[var(--danger)]" />
                  )}
                </div>
              </div>
            ))}
            {todaySlots.length === 0 && (
              <div className="p-4 text-sm text-[var(--foreground-muted)]">
                {labels.noBookingsToday}
              </div>
            )}
          </div>
        </section>

        {/* Incidents & Trust Alerts */}
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-black/10">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">{labels.recentIncidentsTitle}</h2>
                <p className="text-[10px] text-[var(--foreground-muted)]">
                  {recentIncidents.length} {labels.recentIncidentsCountSuffix}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/club/incidents`}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:underline"
            >
              {labels.manageCta}
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="p-4 flex items-center gap-4 hover:bg-[var(--surface-elevated)] transition-colors">
                <div className="h-10 w-10 rounded-full bg-[var(--danger)]/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-[var(--danger)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{incident.playerName}</p>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    {incident.reason === "no_show" ? labels.incidentNoShowRisk : labels.incidentTrustAlert}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--danger)]">{incident.trustScore ?? 0}</p>
                  <p className="text-[9px] text-[var(--foreground-muted)]">{labels.trustLabel}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
              </div>
            ))}
            {recentIncidents.length === 0 && (
              <div className="p-4 text-sm text-[var(--foreground-muted)]">
                {labels.noTrustAlerts}
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
            <Link
              href={`/${locale}/club/incidents`}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] text-sm font-bold hover:bg-[var(--warning)]/20 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              {labels.reportIncidentCta}
            </Link>
          </div>
        </section>
      </div>

      {/* Payment Methods Summary */}
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl shadow-black/10 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-[var(--gold)]" />
          </div>
          <div>
            <h2 className="font-bold text-white">{labels.paymentMethodsTitle}</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">{labels.paymentMethodsSubtitle}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
            <p className="text-2xl font-bold text-[var(--success)]">
              {todaySlots.length === 0
                ? "0%"
                : `${Math.round(
                    (todaySlots.filter((slot) => slot.paymentMethod === "online").length /
                      todaySlots.length) *
                      100
                  )}%`}
            </p>
            <p className="text-sm text-[var(--foreground-muted)]">{labels.paymentOnline}</p>
            <p className="text-[10px] text-[var(--success)] mt-1">{labels.paymentSourceToday}</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/20">
            <p className="text-2xl font-bold text-[var(--warning)]">
              {todaySlots.length === 0
                ? "0%"
                : `${Math.round(
                    (todaySlots.filter((slot) => slot.paymentMethod !== "online").length /
                      todaySlots.length) *
                      100
                  )}%`}
            </p>
            <p className="text-sm text-[var(--foreground-muted)]">{labels.paymentAtClub}</p>
            <p className="text-[10px] text-[var(--foreground-muted)] mt-1">{labels.paymentOnSiteTrustHint}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "warning";
}) {
  return (
    <div className="min-w-0 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg shadow-black/10 sm:p-4">
      <div className="flex items-center justify-between">
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            variant === "warning" ? "bg-[var(--warning)]/10" : "bg-[var(--gold)]/10"
          }`}
        >
          <Icon className={`h-4 w-4 ${variant === "warning" ? "text-[var(--warning)]" : "text-[var(--gold)]"}`} />
        </div>
        {trend && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              trendUp ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`text-xl sm:text-2xl font-bold leading-tight break-words ${variant === "warning" ? "text-[var(--warning)]" : "text-white"}`}
        >
          {value}
        </p>
        <p className="mt-1 text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider leading-tight">
          {label}
        </p>
      </div>
    </div>
  );
}
