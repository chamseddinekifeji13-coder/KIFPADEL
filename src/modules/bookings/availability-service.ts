import { fetchBookingsByClubAndDate } from "./repository";
import { fetchCourtsByClub, fetchClubById } from "@/modules/clubs/repository";
import { DEFAULT_BOOKING_DURATION_MINUTES } from "@/modules/bookings/constants";
import { addMinutes, formatTunisHm, tunisLocalDateTimeToUtc } from "./timezone";

export interface TimeSlot {
  id: string;          // Unique ID for selection (time-courtId)
  time: string;        // HH:mm format for display
  start: string;       // HH:mm
  end: string;         // HH:mm
  isAvailable: boolean;
  courtId: string;     // Specific court for this slot
  courtLabel: string;  // Name of the court
  price: number;       // Price in DT
}

/**
 * Service to handle complex availability calculations.
 * Returns one slot per court per time segment so each court is bookable individually.
 */
export async function getClubAvailability(clubId: string, date: string): Promise<TimeSlot[]> {
  const [club, courts, bookings] = await Promise.all([
    fetchClubById(clubId),
    fetchCourtsByClub(clubId),
    fetchBookingsByClubAndDate(clubId, date)
  ]);

  if (!club) return [];

  const slotDuration = DEFAULT_BOOKING_DURATION_MINUTES;
  const openingTime = club.opening_time || "08:00";
  const closingTime = club.closing_time || "23:00";

  // Generate slots dynamically
  const slots: TimeSlot[] = [];
  let current = tunisLocalDateTimeToUtc(date, openingTime);
  const endOfDay = tunisLocalDateTimeToUtc(date, closingTime);

  while (current < endOfDay) {
    const startStr = formatTunisHm(current);
    const end = addMinutes(current, slotDuration);
    const endStr = formatTunisHm(end);

    // Stop if the slot goes beyond closing time
    if (end > endOfDay) break;

    // For each court, check if it's available for this specific time segment
    for (const court of courts) {
      const isOccupied = bookings.some(booking => {
        if (booking.court_id !== court.id) return false;
        
        const bookingStart = new Date(booking.starts_at);
        const bookingEnd = new Date(booking.ends_at);
        
        return current < bookingEnd && end > bookingStart;
      });

      slots.push({
        id: `${startStr}-${court.id}`,
        time: startStr,
        start: startStr,
        end: endStr,
        isAvailable: !isOccupied,
        courtId: court.id,
        courtLabel: court.label,
        price: court.price_per_slot ?? 40,
      });
    }

    // Move to next time segment
    current = addMinutes(current, slotDuration);
  }

  return slots;
}
