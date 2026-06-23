import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import type { ProfileGateInput } from "@/modules/compliance/new-account-gates";

export type BookingSplitInvite = {
  inviteId: string;
  seatIndex: number;
  inviteToken: string;
  sharePrice: number;
  expiresAt: string;
  status: string;
  inviteSource?: "player" | "club";
};

export type BookingInvitePublic = {
  inviteId: string;
  bookingId: string;
  seatIndex: number;
  sharePrice: number;
  expiresAt: string;
  status: string;
  clubName: string;
  startsAt: string;
  endsAt: string;
  isExpired: boolean;
  invitedByUserId: string;
  inviteSource: "player" | "club";
};

export async function fetchProfilePaymentGateFields(
  userId: string,
): Promise<ProfileGateInput | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("trust_score, created_at, phone_verified_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as ProfileGateInput;
  } catch (err) {
    rethrowFrameworkError(err);
    return null;
  }
}

export async function fetchBookingSplitInvites(bookingId: string): Promise<BookingSplitInvite[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("booking_participant_invites")
      .select("id, seat_index, share_price, expires_at, status, invite_source")
      .eq("booking_id", bookingId)
      .order("seat_index", { ascending: true });

    if (error) {
      console.warn("[split-payment.fetchBookingSplitInvites]", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      inviteId: String((row as { id: string }).id),
      seatIndex: Number((row as { seat_index: number }).seat_index),
      inviteToken: "",
      sharePrice: Number((row as { share_price: number }).share_price),
      expiresAt: String((row as { expires_at: string }).expires_at),
      status: String((row as { status: string }).status),
      inviteSource: (row as { invite_source?: string }).invite_source === "club" ? "club" : "player",
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function fetchBookingInvitePublic(
  inviteId: string,
): Promise<BookingInvitePublic | null> {
  try {
    // Admin : la RLS masque les invites expirées/acceptées aux visiteurs → 404 trompeuse.
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("booking_participant_invites")
      .select(
        "id, booking_id, seat_index, share_price, expires_at, status, invited_by, invite_source, bookings(id, starts_at, ends_at, club_id, clubs(name))",
      )
      .eq("id", inviteId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as {
      id: string;
      booking_id: string;
      seat_index: number;
      share_price: number;
      expires_at: string;
      status: string;
      invited_by: string;
      invite_source?: string | null;
      bookings:
        | {
            starts_at?: string;
            ends_at?: string;
            clubs?: { name?: string } | { name?: string }[] | null;
          }
        | {
            starts_at?: string;
            ends_at?: string;
            clubs?: { name?: string } | { name?: string }[] | null;
          }[]
        | null;
    };

    const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
    const clubs = booking?.clubs;
    const clubName = Array.isArray(clubs)
      ? clubs[0]?.name
      : (clubs as { name?: string } | null)?.name;

    const expiresAt = String(row.expires_at);
    const status = String(row.status);

    return {
      inviteId: String(row.id),
      bookingId: String(row.booking_id),
      seatIndex: Number(row.seat_index),
      sharePrice: Number(row.share_price),
      expiresAt,
      status,
      clubName: clubName ?? "Club",
      startsAt: String(booking?.starts_at ?? ""),
      endsAt: String(booking?.ends_at ?? ""),
      isExpired: status !== "pending" || new Date(expiresAt).getTime() <= Date.now(),
      invitedByUserId: String(row.invited_by),
      inviteSource: row.invite_source === "club" ? "club" : "player",
    };
  } catch (err) {
    rethrowFrameworkError(err);
    return null;
  }
}
