import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { PlayersDirectory } from "./players-directory";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { fetchBookingsForClubDateRange } from "@/modules/bookings/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClubPlayersPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: dictionary.club.playersMetaTitle,
  };
}

export default async function ClubPlayersPage({ params }: ClubPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.club;
  const user = await requireUser({ locale, redirectPath: "club/players" });
  const managedClub = await clubService.getManagedClub(user.id);

  if (!managedClub) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground-muted)]">
        {labels.noClubAccessSubtitle}
      </div>
    );
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 30);
  const bookings = await fetchBookingsForClubDateRange(
    managedClub.id,
    start.toISOString().slice(0, 10),
    today.toISOString().slice(0, 10)
  );

  const playerIds = [...new Set(bookings.map((booking) => booking.created_by ?? booking.player_id).filter(Boolean))] as string[];
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = playerIds.length
    ? await supabase.from("profiles").select("id, display_name, trust_score, league, phone").in("id", playerIds)
    : { data: [] as { id: string; display_name: string | null; trust_score: number | null; league: string | null; phone: string | null }[] };

  const bookingsByPlayer = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const key = (booking.created_by ?? booking.player_id) as string | undefined;
    if (!key) continue;
    const list = bookingsByPlayer.get(key) ?? [];
    list.push(booking);
    bookingsByPlayer.set(key, list);
  }

  const players = (profiles ?? []).map((profile) => {
    const playerBookings = bookingsByPlayer.get(profile.id) ?? [];
    const latestBooking = playerBookings.sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    )[0];
    return {
      id: profile.id,
      name: profile.display_name ?? labels.genericPlayerName,
      trustScore: profile.trust_score ?? 70,
      league: (profile.league ?? "bronze").toLowerCase(),
      bookingsCount: playerBookings.length,
      lastVisit: latestBooking?.starts_at ?? today.toISOString(),
      phone: profile.phone ?? labels.unknownPhone,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{labels.clubPlayersTitle}</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          {labels.clubPlayersSubtitle}
        </p>
      </div>

      <PlayersDirectory players={players} locale={locale} labels={labels} />
    </div>
  );
}
