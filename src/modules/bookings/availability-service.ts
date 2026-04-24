import { fetchBookingsByClubAndDate } from "./repository";
import { fetchCourtsByClub } from "@/modules/clubs/repository";

export interface TimeSlot {
  start: string; // ISO string or HH:mm
  end: string;
  isAvailable: boolean;
  availableCourtIds: string[];
  price?: number;
}

const DEFAULT_SLOTS = [
  "08:00", "09:30", "11:00", "12:30", "14:00", 
  "15:30", "17:00", "18:30", "20:00", "21:30"
];

/**
 * Service to handle complex availability calculations.
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

    const availableCourtIds = courts
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
      })
      .map(court => court.id);

    return {
      start: timeStr,
      end: end.toTimeString().substring(0, 5),
      availableCourtIds,
      isAvailable: availableCourtIds.length > 0
    };
  });

  return slots;
}
