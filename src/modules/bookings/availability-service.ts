import { fetchBookingsByClubAndDate } from "./repository";
import { fetchCourtsByClub } from "@/modules/clubs/repository";

export interface TimeSlot {
  time: string;        // HH:mm format for display
  start: string;       // ISO string or HH:mm
  end: string;
  isAvailable: boolean;
  availableCourtIds: string[];
  courtId: string;     // First available court for this slot
  price: number;       // Price in DT
}

const DEFAULT_SLOTS = [
  "08:00", "09:30", "11:00", "12:30", "14:00", 
  "15:30", "17:00", "18:30", "20:00", "21:30"
];

/**
 * Service to handle complex availability calculations.
 * Returns slots with the first available court and its price.
 */
export async function getClubAvailability(clubId: string, date: string): Promise<TimeSlot[]> {
  const [courts, bookings] = await Promise.all([
    fetchCourtsByClub(clubId),
    fetchBookingsByClubAndDate(clubId, date)
  ]);

  const slots: TimeSlot[] = DEFAULT_SLOTS.map(timeStr => {
    // Construct full ISO strings for comparison
    const start = new Date(`${date}T${timeStr}:00`);
    const end = new Date(start.getTime() + 90 * 60000);

    const availableCourts = courts
      .filter(court => {
        // Check if this court has a booking overlapping with this slot
        const isOccupied = bookings.some(booking => {
          if (booking.court_id !== court.id) return false;
          
          const bookingStart = new Date(booking.starts_at);
          const bookingEnd = new Date(booking.ends_at);
          
          // Overlap logic: (StartA < EndB) && (EndA > StartB)
          return start < bookingEnd && end > bookingStart;
        });
        
        return !isOccupied;
      });

    const availableCourtIds = availableCourts.map(court => court.id);
    const firstAvailableCourt = availableCourts[0];
    
    // Get price from the first available court, default to 40 DT
    const price = firstAvailableCourt?.price_per_slot ?? 40;

    return {
      time: timeStr,
      start: timeStr,
      end: end.toTimeString().substring(0, 5),
      availableCourtIds,
      isAvailable: availableCourtIds.length > 0,
      courtId: firstAvailableCourt?.id ?? "",
      price,
    };
  });

  return slots;
}
