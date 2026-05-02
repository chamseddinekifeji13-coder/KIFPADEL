import { fetchBookingsByClubAndDate } from "./repository";
import { fetchCourtsByClub, fetchClubById, type Club } from "@/modules/clubs/repository";

export interface TimeSlot {
  time: string;        // HH:mm format for display
  start: string;       // HH:mm
  end: string;         // HH:mm
  isAvailable: boolean;
  availableCourtIds: string[];
  courtId: string;     // First available court for this slot
  price: number;       // Price in DT
}

/**
 * Service to handle complex availability calculations.
 * Returns slots with the first available court and its price.
 */
export async function getClubAvailability(clubId: string, date: string): Promise<TimeSlot[]> {
  const [club, courts, bookings] = await Promise.all([
    fetchClubById(clubId) as Promise<Club>,
    fetchCourtsByClub(clubId),
    fetchBookingsByClubAndDate(clubId, date)
  ]);

  if (!club) return [];

  const slotDuration = club.slot_duration_minutes || 90;
  const openingTime = club.opening_time || "08:00";
  const closingTime = club.closing_time || "23:00";

  // Generate slots dynamically
  const slots: TimeSlot[] = [];
  let current = new Date(`${date}T${openingTime}:00`);
  const endOfDay = new Date(`${date}T${closingTime}:00`);

  while (current < endOfDay) {
    const startStr = current.toTimeString().substring(0, 5);
    const end = new Date(current.getTime() + slotDuration * 60000);
    const endStr = end.toTimeString().substring(0, 5);

    // Stop if the slot goes beyond closing time
    if (end > endOfDay) break;

    const availableCourts = courts
      .filter(court => {
        // Check overlap
        const isOccupied = bookings.some(booking => {
          if (booking.court_id !== court.id) return false;
          
          const bookingStart = new Date(booking.starts_at);
          const bookingEnd = new Date(booking.ends_at);
          
          return current < bookingEnd && end > bookingStart;
        });
        
        return !isOccupied;
      });

    const availableCourtIds = availableCourts.map(court => court.id);
    const firstAvailableCourt = availableCourts[0];
    
    // Get price from the first available court, default to 40 DT
    const price = firstAvailableCourt?.price_per_slot ?? 40;

    slots.push({
      time: startStr,
      start: startStr,
      end: endStr,
      availableCourtIds,
      isAvailable: availableCourtIds.length > 0,
      courtId: firstAvailableCourt?.id ?? "",
      price,
    });

    // Move to next slot
    current = new Date(current.getTime() + slotDuration * 60000);
  }

  return slots;
}
