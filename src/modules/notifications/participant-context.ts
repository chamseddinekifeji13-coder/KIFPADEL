import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/config/env";
import {
  formatAmountDt,
  formatBookingSchedule,
  formatPaymentMethodLabel,
} from "@/modules/notifications/booking-format";

export type ParticipantNotificationContext = {
  locale: "fr" | "en";
  participantId: string;
  playerId: string;
  bookingId: string;
  clubName: string;
  courtLabel: string;
  playerName: string;
  amount: string;
  seat: string;
  dateLine: string;
  timeRange: string;
  paymentLabel: string;
  playerPhone: string;
  playerEmail: string;
};

export async function loadParticipantNotificationContext(
  participantId: string,
): Promise<ParticipantNotificationContext | null> {
  try {
    const admin = createSupabaseAdminClient();
    const locale = publicEnv.defaultLocale;

    const { data: participant, error: participantError } = await admin
      .from("booking_participants")
      .select("id, booking_id, player_id, seat_index, share_price, payment_method")
      .eq("id", participantId)
      .maybeSingle();

    if (participantError || !participant) {
      return null;
    }

    const bookingId = String(participant.booking_id);
    const playerId = String(participant.player_id);

    const { data: booking } = await admin
      .from("bookings")
      .select("id, club_id, court_id, starts_at, ends_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      return null;
    }

    const { data: club } = await admin
      .from("clubs")
      .select("name")
      .eq("id", booking.club_id)
      .maybeSingle();

    const { data: court } = await admin
      .from("courts")
      .select("label")
      .eq("id", booking.court_id)
      .maybeSingle();

    const { data: playerProfile } = await admin
      .from("profiles")
      .select("display_name, phone_e164")
      .eq("id", playerId)
      .maybeSingle();

    const { data: authUser } = await admin.auth.admin.getUserById(playerId);

    const { dateLine, timeRange } = formatBookingSchedule(booking.starts_at, booking.ends_at, locale);

    return {
      locale,
      participantId,
      playerId,
      bookingId,
      clubName: club?.name?.trim() || "Club",
      courtLabel: court?.label?.trim() || "Terrain",
      playerName: playerProfile?.display_name?.trim() || "Joueur",
      amount: formatAmountDt(participant.share_price),
      seat: String(participant.seat_index ?? 1),
      dateLine,
      timeRange,
      paymentLabel: formatPaymentMethodLabel(participant.payment_method, locale),
      playerPhone: playerProfile?.phone_e164?.trim() ?? "",
      playerEmail: authUser?.user?.email?.trim() ?? "",
    };
  } catch (err) {
    console.error("[loadParticipantNotificationContext] error", err);
    return null;
  }
}
