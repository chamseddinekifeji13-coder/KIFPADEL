import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Repository for Booking related database operations.
 */
export async function fetchBookingsByClubAndDate(clubId: string, date: string) {
  const supabase = await createSupabaseServerClient();
  
  // Define the start and end of the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("club_id", clubId)
    .gte("starts_at", startOfDay.toISOString())
    .lte("starts_at", endOfDay.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createBooking(payload: {
  club_id: string;
  court_id: string;
  player_id: string;
  starts_at: string;
  ends_at: string;
  total_price: number;
}) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
