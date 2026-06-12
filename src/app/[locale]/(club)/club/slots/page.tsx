import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { SlotsManager } from "./slots-manager";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { fetchCourtsByClub } from "@/modules/clubs/repository";
import { fetchBookingsForClubOperations } from "@/modules/bookings/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClubSlotsPageProps = {
  params: Promise<{ locale: string }>;
};

/** Jours calendaires en UTC (aligné sur `todayDate`) pour éviter mismatch d’hydratation Node vs navigateur. */
function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const [y, mo, d] = ymd.split("-").map((p) => parseInt(p, 10));
  const ms = Date.UTC(y, mo - 1, d) + deltaDays * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export async function generateMetadata({ params }: ClubSlotsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: dictionary.club.slotsMetaTitle,
  };
}

export default async function ClubSlotsPage({ params }: ClubSlotsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.club;
  const user = await requireUser({ locale, redirectPath: "club/slots" });
  const managedClub = await clubService.getManagedClub(user.id);

  if (!managedClub) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground-muted)]">
        {labels.noClubAccessSubtitle}
      </div>
    );
  }

  const todayDate = new Date().toISOString().slice(0, 10);
  const timeLocale = locale === "en" ? "en-GB" : "fr-FR";
  const [bookingsRows, courtsRows] = await Promise.all([
    fetchBookingsForClubOperations(managedClub.id, todayDate),
    fetchCourtsByClub(managedClub.id),
  ]);

  const playerIds = [...new Set(bookingsRows.map((booking) => booking.created_by ?? booking.player_id).filter(Boolean))];
  const supabase = await createSupabaseServerClient();
  const { data: players } = playerIds.length
    ? await supabase.from("profiles").select("id, display_name, trust_score, phone").in("id", playerIds as string[])
    : { data: [] as { id: string; display_name: string | null; trust_score: number | null; phone: string | null }[] };

  const playerById = new Map((players ?? []).map((player) => [player.id, player]));
  const courtLabelById = new Map(courtsRows.map((court) => [court.id, court.label]));
  const normalizedStatus = (status: string): "confirmed" | "pending" | "cancelled" | "completed" | "no_show" =>
    status === "pending" || status === "cancelled" || status === "completed" || status === "no_show"
      ? status
      : "confirmed";

  const bookings = bookingsRows.map((booking) => {
    const playerId = (booking.created_by ?? booking.player_id) as string;
    const player = playerById.get(playerId);
    const paymentMethod: "online" | "on_site" = booking.payment_method === "online" ? "online" : "on_site";
    return {
      id: booking.id,
      time: new Date(booking.starts_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" }),
      endTime: new Date(booking.ends_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" }),
      court: courtLabelById.get(booking.court_id) ?? `${labels.fallbackCourtLabel} ${booking.court_id.slice(0, 4)}`,
      player: {
        id: playerId ?? "unknown",
        name: player?.display_name ?? labels.genericPlayerName,
        trustScore: player?.trust_score ?? 70,
        phone: player?.phone ?? labels.unknownPhone,
      },
      status: normalizedStatus(booking.status),
      paymentMethod,
      amount: booking.total_price ?? 0,
    };
  });

  const courts = courtsRows.map((court) => court.label);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const ymd = addCalendarDaysYmd(todayDate, i);
    const [y, mo, d] = ymd.split("-").map((p) => parseInt(p, 10));
    const midday = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
    return {
      ymd,
      weekdayShort: midday.toLocaleDateString(timeLocale, { weekday: "short", timeZone: "UTC" }),
      dayOfMonth: midday.getUTCDate(),
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{dictionary.club.slotsTitle}</h1>
          <p className="text-[var(--foreground-muted)] text-sm mt-1">
            {labels.slotsHeaderSubtitle}
          </p>
        </div>
      </div>

      <SlotsManager bookings={bookings} courts={courts} labels={labels} weekDays={weekDays} />
    </div>
  );
}
