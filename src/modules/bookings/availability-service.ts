import {
  BOOKING_SEATS_PER_COURT,
  countActiveBookingParticipants,
  type BookingParticipantRow,
} from "@/domain/rules/booking-participant";
import { resolveCourtPlayerPrice } from "@/domain/rules/court-pricing";
import { fetchBookingsByClubAndDate, type BookingWithParticipantsRow } from "./repository";
import { fetchCourtsByClub, fetchClubById } from "@/modules/clubs/repository";
import { resolveBookingDurationMinutes } from "@/modules/bookings/constants";
import { addMinutes, formatTunisHm, tunisLocalDateTimeToUtc } from "./timezone";

export interface TimeSlot {
  id: string;
  time: string;
  start: string;
  end: string;
  isAvailable: boolean;
  courtId: string;
  courtLabel: string;
  /** Part joueur en DT (phase 1). */
  price: number;
  seatsTaken: number;
  seatsTotal: number;
  seatsAvailable: number;
}

function overlapsRange(
  aStart: Date,
  aEnd: Date,
  bStartIso: string,
  bEndIso: string,
): boolean {
  const bStart = new Date(bStartIso).getTime();
  const bEnd = new Date(bEndIso).getTime();
  return aStart.getTime() < bEnd && aEnd.getTime() > bStart;
}

function findSessionBooking(
  bookings: BookingWithParticipantsRow[],
  courtId: string,
  startsAtIso: string,
  endsAtIso: string,
): BookingWithParticipantsRow | undefined {
  return bookings.find(
    (b) =>
      b.court_id === courtId &&
      b.starts_at === startsAtIso &&
      b.ends_at === endsAtIso &&
      String(b.status ?? "").toLowerCase() !== "cancelled",
  );
}

function hasBlockingFullSession(
  bookings: BookingWithParticipantsRow[],
  courtId: string,
  slotStart: Date,
  slotEnd: Date,
  excludeBookingId?: string,
): boolean {
  return bookings.some((b) => {
    if (b.court_id !== courtId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (!b.is_blocking && String(b.status ?? "").toLowerCase() !== "full") return false;
    if (String(b.status ?? "").toLowerCase() === "cancelled") return false;
    return overlapsRange(slotStart, slotEnd, b.starts_at, b.ends_at);
  });
}

/**
 * Service to handle complex availability calculations.
 * Phase 2 : jusqu'à 4 joueurs par créneau/terrain.
 */
export async function getClubAvailability(clubId: string, date: string): Promise<TimeSlot[]> {
  const [club, courts, bookings] = await Promise.all([
    fetchClubById(clubId),
    fetchCourtsByClub(clubId),
    fetchBookingsByClubAndDate(clubId, date),
  ]);

  if (!club) return [];

  const slotDuration = resolveBookingDurationMinutes(club.slot_duration_minutes);
  const openingTime = club.opening_time || "08:00";
  const closingTime = club.closing_time || "23:00";

  const slots: TimeSlot[] = [];
  let current = tunisLocalDateTimeToUtc(date, openingTime);
  const endOfDay = tunisLocalDateTimeToUtc(date, closingTime);

  while (current < endOfDay) {
    const startStr = formatTunisHm(current);
    const end = addMinutes(current, slotDuration);
    const endStr = formatTunisHm(end);

    if (end > endOfDay) break;

    const startsAtIso = current.toISOString();
    const endsAtIso = end.toISOString();

    for (const court of courts) {
      const session = findSessionBooking(bookings, court.id, startsAtIso, endsAtIso);
      const participants = (session?.booking_participants ?? []) as BookingParticipantRow[];
      const seatsTaken = session ? countActiveBookingParticipants(participants) : 0;
      const seatsTotal = BOOKING_SEATS_PER_COURT;
      const seatsAvailable = Math.max(0, seatsTotal - seatsTaken);

      const blockedByOther = hasBlockingFullSession(
        bookings,
        court.id,
        current,
        end,
        session?.id,
      );

      const isAvailable = seatsAvailable > 0 && !blockedByOther;

      slots.push({
        id: `${startStr}-${court.id}`,
        time: startStr,
        start: startStr,
        end: endStr,
        isAvailable,
        courtId: court.id,
        courtLabel: court.label,
        price: resolveCourtPlayerPrice(court),
        seatsTaken,
        seatsTotal,
        seatsAvailable,
      });
    }

    current = addMinutes(current, slotDuration);
  }

  return slots;
}
