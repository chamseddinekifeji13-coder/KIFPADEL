import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tunisDayRangeUtc } from "./timezone";

/** Must stay aligned with overlap logic in `create_booking_atomic` + `bookings.is_blocking` trigger */
export const PENDING_BOOKING_TTL_MINUTES = 15;

/** PostgREST filter: rows that either are not stale pending (> TTL) or are not pending */
export function stalePendingBookingsExcludedOrFilter(): string {
  const pendingCutoffIso = new Date(
    Date.now() - PENDING_BOOKING_TTL_MINUTES * 60 * 1000,
  ).toISOString();
  return `status.neq.pending,and(status.eq.pending,created_at.gte.${pendingCutoffIso})`;
}

const PLAYER_BOOKING_LIMIT = 30;

/**
 * Repository for Booking related database operations.
 */
export async function fetchBookingsByClubAndDate(clubId: string, date: string) {
  const supabase = await createSupabaseServerClient();

  const { dayStart, nextDayStart } = tunisDayRangeUtc(date);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("club_id", clubId)
    .lt("starts_at", nextDayStart.toISOString())
    .gt("ends_at", dayStart.toISOString())
    .neq("status", "cancelled")
    .or(stalePendingBookingsExcludedOrFilter());

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export type PlayerBookingRow = {
  id: string;
  club_id: string;
  court_id: string;
  /** Renseigné après jointure `courts` (nom ou numéro affiché au club / joueur). */
  court_label?: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_method?: string | null;
  total_price?: number | null;
  created_at: string;
  created_by?: string | null;
  player_id?: string | null;
};

export async function fetchBookingsForPlayer(userId: string, limit = PLAYER_BOOKING_LIMIT) {
  const supabase = await createSupabaseServerClient();

  const rowsById = new Map<string, PlayerBookingRow>();

  const byCreatedBy = await supabase
    .from("bookings")
    .select("*")
    .eq("created_by", userId)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (!byCreatedBy.error) {
    for (const row of (byCreatedBy.data ?? []) as PlayerBookingRow[]) {
      rowsById.set(row.id, row);
    }
  }

  const byPlayerId = await supabase
    .from("bookings")
    .select("*")
    .eq("player_id", userId)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (!byPlayerId.error) {
    for (const row of (byPlayerId.data ?? []) as PlayerBookingRow[]) {
      rowsById.set(row.id, row);
    }
  }

  if (byCreatedBy.error && byPlayerId.error) {
    throw new Error(byCreatedBy.error.message);
  }

  const data = [...rowsById.values()]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, limit);

  const clubIds = [...new Set((data ?? []).map((row) => row.club_id).filter(Boolean))];
  const courtIds = [...new Set((data ?? []).map((row) => row.court_id).filter(Boolean))];

  const [clubsRes, courtsRes] = await Promise.all([
    clubIds.length
      ? supabase.from("clubs").select("id,name,city").in("id", clubIds)
      : Promise.resolve({ data: [], error: null }),
    courtIds.length
      ? supabase.from("courts").select("id,label").in("id", courtIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const clubsById = new Map((clubsRes.data ?? []).map((club) => [club.id, club]));
  const courtsById = new Map((courtsRes.data ?? []).map((court) => [court.id, court]));

  return (data ?? []).map((booking) => ({
    ...booking,
    club_name: clubsById.get(booking.club_id)?.name ?? "Club",
    club_city: clubsById.get(booking.club_id)?.city ?? "Tunis",
    court_label: courtsById.get(booking.court_id)?.label ?? "Court",
  }));
}

export async function fetchBookingsForClubOperations(clubId: string, date: string) {
  const supabase = await createSupabaseServerClient();
  const { dayStart, nextDayStart } = tunisDayRangeUtc(date);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("club_id", clubId)
    .lt("starts_at", nextDayStart.toISOString())
    .gt("ends_at", dayStart.toISOString())
    .neq("status", "cancelled")
    .or(stalePendingBookingsExcludedOrFilter())
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PlayerBookingRow[];
  const courtIds = [...new Set(rows.map((r) => r.court_id).filter(Boolean))];
  if (courtIds.length === 0) {
    return rows;
  }

  const { data: courts } = await supabase.from("courts").select("id,label").in("id", courtIds);
  const labelByCourtId = new Map(
    (courts ?? []).map((c) => [c.id as string, String((c as { label?: string }).label ?? "").trim()]),
  );

  return rows.map((r) => ({
    ...r,
    court_label: labelByCourtId.get(r.court_id) || undefined,
  }));
}

export async function fetchBookingsForClubDateRange(clubId: string, startDate: string, endDate: string) {
  const supabase = await createSupabaseServerClient();

  const { dayStart } = tunisDayRangeUtc(startDate);
  const { nextDayStart } = tunisDayRangeUtc(endDate);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("club_id", clubId)
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", nextDayStart.toISOString())
    .or(stalePendingBookingsExcludedOrFilter())
    .order("starts_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as PlayerBookingRow[];
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

  const { data: bookingRows, error: rpcError } = await supabase.rpc("create_booking_atomic", {
    p_club_id: payload.club_id,
    p_court_id: payload.court_id,
    p_player_id: payload.player_id,
    p_starts_at: payload.starts_at,
    p_ends_at: payload.ends_at,
    p_total_price: payload.total_price,
    p_payment_method: null,
    p_status: "confirmed",
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const bookingResult = Array.isArray(bookingRows) ? bookingRows[0] : null;
  if (!bookingResult?.ok || !bookingResult?.booking_id) {
    throw new Error(bookingResult?.error_code || "BOOKING_CREATE_FAILED");
  }

  const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingResult.booking_id).single();

  if (error || !data) {
    throw new Error(error?.message || "BOOKING_FETCH_FAILED");
  }

  return data;
}
