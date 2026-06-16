import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { PlayersDirectory } from "./players-directory";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { fetchClubParticipantsForDateRange } from "@/modules/bookings/repository";
import { normalizePlayerCategoryId } from "@/domain/rules/player-category";
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
  const startYmd = start.toISOString().slice(0, 10);
  const endYmd = today.toISOString().slice(0, 10);

  const participantRows = await fetchClubParticipantsForDateRange(
    managedClub.id,
    startYmd,
    endYmd,
  );

  const playerIds = [...new Set(participantRows.map((row) => row.player_id).filter(Boolean))];
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = playerIds.length
    ? await supabase.from("profiles").select("id, display_name, trust_score, league, phone").in("id", playerIds)
    : { data: [] as { id: string; display_name: string | null; trust_score: number | null; league: string | null; phone: string | null }[] };

  const visitsByPlayer = new Map<string, { count: number; lastVisit: string }>();
  for (const row of participantRows) {
    const bookingRaw = row.bookings;
    const booking = Array.isArray(bookingRaw) ? bookingRaw[0] : bookingRaw;
    const startsAt = booking?.starts_at ?? row.created_at;
    const existing = visitsByPlayer.get(row.player_id);
    if (!existing) {
      visitsByPlayer.set(row.player_id, { count: 1, lastVisit: startsAt });
      continue;
    }
    existing.count += 1;
    if (new Date(startsAt).getTime() > new Date(existing.lastVisit).getTime()) {
      existing.lastVisit = startsAt;
    }
  }

  const players = (profiles ?? []).map((profile) => {
    const stats = visitsByPlayer.get(profile.id);
    return {
      id: profile.id,
      name: profile.display_name ?? labels.genericPlayerName,
      trustScore: profile.trust_score ?? 70,
      league: normalizePlayerCategoryId(profile.league),
      bookingsCount: stats?.count ?? 0,
      lastVisit: stats?.lastVisit ?? today.toISOString(),
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
