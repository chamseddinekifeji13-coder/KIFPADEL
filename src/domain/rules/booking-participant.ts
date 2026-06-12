/** Aligné sur `PENDING_BOOKING_TTL_MINUTES` dans le repository bookings. */
const PENDING_PARTICIPANT_TTL_MINUTES = 15;

export const BOOKING_SEATS_PER_COURT = 4;

export type BookingParticipantStatus = string;

/** Aligné sur `is_booking_participant_active` (SQL). */
export function isBookingParticipantActive(
  status: BookingParticipantStatus,
  createdAt: string | Date,
): boolean {
  const s = String(status ?? "").toLowerCase();
  if (!s || s === "cancelled" || s === "expired" || s === "no_show") {
    return false;
  }
  if (s !== "pending") {
    return true;
  }
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) {
    return false;
  }
  return Date.now() - created < PENDING_PARTICIPANT_TTL_MINUTES * 60 * 1000;
}

export type BookingParticipantRow = {
  id?: string;
  player_id?: string;
  seat_index?: number | null;
  status?: string | null;
  created_at?: string | null;
  share_price?: number | null;
  payment_method?: string | null;
  payment_confirmed_at?: string | null;
};

/** Encaissement pas encore validé par le club (sur place ou en ligne). */
export function isParticipantPaymentPending(
  status: string,
  paymentConfirmedAt: string | null | undefined,
): boolean {
  const s = String(status ?? "").toLowerCase();
  if (!s || s === "cancelled" || s === "expired" || s === "no_show" || s === "completed") {
    return false;
  }
  return !paymentConfirmedAt;
}

export function countActiveBookingParticipants(participants: BookingParticipantRow[]): number {
  return participants.filter((p) =>
    isBookingParticipantActive(String(p.status ?? ""), p.created_at ?? new Date(0)),
  ).length;
}
