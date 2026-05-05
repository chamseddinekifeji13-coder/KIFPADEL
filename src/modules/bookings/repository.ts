import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tunisDayRangeUtc } from "./timezone";

const PENDING_BOOKING_TTL_MINUTES = 15;

/**
 * Repository for Booking related database operations.
 */
export async function fetchBookingsByClubAndDate(clubId: string, date: string) {
  const supabase = await createSupabaseServerClient();

  const { dayStart, nextDayStart } = tunisDayRangeUtc(date);
  const pendingCutoffIso = new Date(
    Date.now() - PENDING_BOOKING_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("club_id", clubId)
    // Overlap logic: booking intersects [dayStart, nextDayStart)
    .lt("starts_at", nextDayStart.toISOString())
    .gt("ends_at", dayStart.toISOString())
    .neq("status", "cancelled")
    // Stale pending bookings should no longer block availability.
    .or(`status.neq.pending,and(status.eq.pending,created_at.gte.${pendingCutoffIso})`);

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

  const { data: bookingRows, error: rpcError } = await supabase.rpc(
    "create_booking_atomic",
    {
      p_club_id: payload.club_id,
      p_court_id: payload.court_id,
      p_player_id: payload.player_id,
      p_starts_at: payload.starts_at,
      p_ends_at: payload.ends_at,
      p_total_price: payload.total_price,
      p_payment_method: null,
      p_status: "confirmed",
    },
  );

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const bookingResult = Array.isArray(bookingRows) ? bookingRows[0] : null;
  if (!bookingResult?.ok || !bookingResult?.booking_id) {
    throw new Error(bookingResult?.error_code || "BOOKING_CREATE_FAILED");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingResult.booking_id)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "BOOKING_FETCH_FAILED");
  }

  return data;
}
