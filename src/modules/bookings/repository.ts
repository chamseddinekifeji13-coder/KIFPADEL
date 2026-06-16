import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isBookingParticipantActive } from "@/domain/rules/booking-participant";
import { tunisDayRangeUtc, formatTunisYmd } from "./timezone";

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
export type BookingWithParticipantsRow = PlayerBookingRow & {
  booking_participants?: BookingParticipantDbRow[];
};

export type BookingParticipantDbRow = {
  id: string;
  booking_id: string;
  player_id: string;
  seat_index: number;
  share_price: number | null;
  payment_method?: string | null;
  payment_confirmed_at?: string | null;
  status: string;
  created_at: string;
};

export async function fetchBookingsByClubAndDate(clubId: string, date: string) {
  const supabase = await createSupabaseServerClient();

  const { dayStart, nextDayStart } = tunisDayRangeUtc(date);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "*, booking_participants(id, booking_id, player_id, seat_index, status, created_at, share_price, payment_method, payment_confirmed_at)",
    )
    .eq("club_id", clubId)
    .lt("starts_at", nextDayStart.toISOString())
    .gt("ends_at", dayStart.toISOString())
    .neq("status", "cancelled")
    .or(stalePendingBookingsExcludedOrFilter());

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BookingWithParticipantsRow[];
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
  participant_id?: string;
  seat_index?: number;
  is_blocking?: boolean | null;
};

export async function fetchBookingsForPlayer(userId: string, limit = PLAYER_BOOKING_LIMIT) {
  const supabase = await createSupabaseServerClient();

  const { data: participantRows, error: participantError } = await supabase
    .from("booking_participants")
    .select(
      "id, share_price, payment_method, status, seat_index, bookings(id, club_id, court_id, starts_at, ends_at, status, created_at, created_by, player_id, total_price)",
    )
    .eq("player_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  let data: PlayerBookingRow[] | null = null;

  if (!participantError && (participantRows ?? []).length > 0) {
    data = (participantRows ?? []).map((row) => {
      const bookingRaw = (row as { bookings?: PlayerBookingRow | PlayerBookingRow[] }).bookings;
      const booking = Array.isArray(bookingRaw) ? bookingRaw[0] : bookingRaw;
      const b = (booking ?? {}) as PlayerBookingRow;
      return {
        ...b,
        id: b.id ?? String((row as { booking_id?: string }).booking_id ?? ""),
        total_price: (row as { share_price?: number }).share_price ?? b.total_price,
        status: String((row as { status?: string }).status ?? b.status),
        participant_id: String((row as { id: string }).id),
        seat_index: (row as { seat_index?: number }).seat_index,
      };
    });
  }

  if (!data) {
    const byCreatedBy = await supabase
      .from("bookings")
      .select("*")
      .eq("created_by", userId)
      .order("starts_at", { ascending: true })
      .limit(limit);

    if (!byCreatedBy.error) {
      data = (byCreatedBy.data ?? []) as PlayerBookingRow[];
    } else {
      const byPlayerId = await supabase
        .from("bookings")
        .select("*")
        .eq("player_id", userId)
        .order("starts_at", { ascending: true })
        .limit(limit);

      if (byPlayerId.error) {
        throw new Error(byPlayerId.error.message);
      }
      data = (byPlayerId.data ?? []) as PlayerBookingRow[];
    }
  }

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

export type ClubOperationsParticipantRow = {
  id: string;
  booking_id: string;
  player_id: string;
  seat_index: number;
  share_price: number | null;
  payment_method?: string | null;
  payment_confirmed_at?: string | null;
  status: string;
  created_at: string;
  bookings?: PlayerBookingRow | PlayerBookingRow[] | null;
};

export async function fetchBookingParticipantsForClubOperations(clubId: string, date: string) {
  const supabase = await createSupabaseServerClient();
  const { dayStart, nextDayStart } = tunisDayRangeUtc(date);

  const { data, error } = await supabase
    .from("booking_participants")
    .select(
      "id, booking_id, player_id, seat_index, share_price, payment_method, payment_confirmed_at, status, created_at, bookings!inner(id, club_id, court_id, starts_at, ends_at, status)",
    )
    .eq("bookings.club_id", clubId)
    .lt("bookings.starts_at", nextDayStart.toISOString())
    .gt("bookings.ends_at", dayStart.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubOperationsParticipantRow[];
}

function bookingStartsAtFromParticipantRow(row: ClubOperationsParticipantRow): string {
  const bookingRaw = row.bookings;
  const booking = Array.isArray(bookingRaw) ? bookingRaw[0] : bookingRaw;
  return booking?.starts_at ?? "";
}

/**
 * Lignes créneaux club : réservations du jour + participants (repli si backfill manquant).
 */
export async function fetchClubSlotOperationRows(clubId: string, date: string) {
  const bookings = await fetchBookingsByClubAndDate(clubId, date);
  const rows: ClubOperationsParticipantRow[] = [];

  for (const booking of bookings) {
    const participants = booking.booking_participants ?? [];
    const visibleParticipants = participants.filter((p) =>
      isBookingParticipantActive(p.status, p.created_at),
    );
    const list = visibleParticipants.length > 0 ? visibleParticipants : participants;

    if (list.length > 0) {
      for (const p of list) {
        rows.push({
          id: p.id,
          booking_id: booking.id,
          player_id: p.player_id,
          seat_index: p.seat_index,
          share_price: p.share_price,
          payment_method: p.payment_method,
          payment_confirmed_at: p.payment_confirmed_at,
          status: p.status,
          created_at: p.created_at,
          bookings: booking,
        });
      }
      continue;
    }

    const playerId = booking.created_by ?? booking.player_id;
    if (!playerId) continue;

    rows.push({
      id: `legacy-${booking.id}`,
      booking_id: booking.id,
      player_id: playerId,
      seat_index: 1,
      share_price: booking.total_price ?? null,
      payment_method: booking.payment_method,
      payment_confirmed_at: null,
      status: booking.status,
      created_at: booking.created_at,
      bookings: booking,
    });
  }

  return rows.sort((a, b) =>
    bookingStartsAtFromParticipantRow(a).localeCompare(bookingStartsAtFromParticipantRow(b)),
  );
}

/** Date du jour en fuseau Tunis (pour dashboard / créneaux club). */
export function todayTunisYmd(): string {
  return formatTunisYmd();
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
