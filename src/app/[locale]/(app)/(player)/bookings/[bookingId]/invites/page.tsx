import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BookingSplitInvitesPanel } from "@/components/features/bookings/booking-split-invites-panel";
import { fetchBookingSplitInvites } from "@/modules/bookings/split-payment-repository";
import { isBookingParticipantActive } from "@/domain/rules/booking-participant";
import { playerBookingsPath } from "@/lib/booking-paths";

type Props = {
  params: Promise<{ locale: string; bookingId: string }>;
};

export default async function BookingSplitInvitesPage({ params }: Props) {
  const { locale, bookingId } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/bookings/${bookingId}/invites`);
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, club_id, starts_at, ends_at, status, clubs(name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    notFound();
  }

  const { data: participants } = await supabase
    .from("booking_participants")
    .select("player_id, seat_index, share_price, status, created_at")
    .eq("booking_id", bookingId);

  const myParticipant = (participants ?? []).find(
    (row) => String((row as { player_id: string }).player_id) === user.id,
  );

  if (!myParticipant) {
    notFound();
  }

  const activeCount = (participants ?? []).filter((row) =>
    isBookingParticipantActive(
      String((row as { status?: string }).status ?? "pending"),
      String((row as { created_at: string }).created_at),
    ),
  ).length;

  const existingInvites = await fetchBookingSplitInvites(bookingId);
  const pendingInviteCount = existingInvites.filter((inv) => inv.status === "pending").length;
  const emptySeats = Math.max(0, 4 - activeCount - pendingInviteCount);
  const partnerTargetCount = emptySeats + pendingInviteCount;

  const clubs = (booking as { clubs?: { name?: string } | { name?: string }[] | null }).clubs;
  const clubName = Array.isArray(clubs)
    ? clubs[0]?.name
    : (clubs as { name?: string } | null)?.name;

  const sharePrice = Number(
    (myParticipant as { share_price?: number }).share_price ?? 0,
  );

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto pb-20">
      <Link
        href={playerBookingsPath(locale)}
        className="text-sm text-[var(--gold)] font-medium"
      >
        ← {labels.bookingInviteBackLink}
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-white">{labels.bookingInvitePageTitle}</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {clubName ?? "Club"} ·{" "}
          {new Date(String((booking as { starts_at: string }).starts_at)).toLocaleString(
            locale === "en" ? "en-GB" : "fr-FR",
          )}
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <BookingSplitInvitesPanel
          locale={locale}
          bookingId={bookingId}
          clubName={clubName ?? "Club"}
          sharePrice={sharePrice}
          existingInvites={existingInvites}
          emptySeats={emptySeats}
          partnerTargetCount={partnerTargetCount}
        />
      </section>
    </div>
  );
}
