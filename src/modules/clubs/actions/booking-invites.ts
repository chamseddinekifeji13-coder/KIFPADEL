"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { assertClubStaffCanManage } from "@/modules/clubs/actions/club-staff-guard";
import type { BookingSplitInvite } from "@/modules/bookings/split-payment-repository";

export type ClubInviteActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

type InviteRow = {
  invite_id: string;
  seat_index: number;
  invite_token: string;
  share_price: number;
  expires_at: string;
};

function mapRows(rows: InviteRow[]): BookingSplitInvite[] {
  return rows.map((row) => ({
    inviteId: String(row.invite_id),
    seatIndex: Number(row.seat_index),
    inviteToken: String(row.invite_token),
    sharePrice: Number(row.share_price),
    expiresAt: String(row.expires_at),
    status: "pending",
    inviteSource: "club" as const,
  }));
}

async function assertStaffForBooking(bookingId: string) {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Connexion requise." };
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("club_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking?.club_id) {
    return { ok: false as const, error: "Réservation introuvable." };
  }

  const guard = await assertClubStaffCanManage(supabase, String(booking.club_id), user.id);
  if (!guard.ok) {
    return { ok: false as const, error: "Action non autorisée pour ce club." };
  }

  return { ok: true as const, supabase, clubId: String(booking.club_id) };
}

function mapRpcError(msg: string): string {
  if (msg.includes("NOT_CLUB_STAFF")) return "Droits gérant requis.";
  if (msg.includes("BOOKING_NOT_FOUND")) return "Réservation introuvable ou annulée.";
  if (msg.includes("UNAUTHORIZED")) return "Connexion requise.";
  return "Opération impossible.";
}

export async function createClubBookingInvitesAction(input: {
  locale: string;
  bookingId: string;
}): Promise<ClubInviteActionResult<{ invites: BookingSplitInvite[] }>> {
  const locale = input.locale?.trim() || "fr";
  const bookingId = input.bookingId?.trim();
  if (!bookingId) return { ok: false, error: "Réservation introuvable." };

  const staff = await assertStaffForBooking(bookingId);
  if (!staff.ok) return staff;

  const { data, error } = await staff.supabase.rpc("create_club_booking_split_invites", {
    p_booking_id: bookingId,
  });

  if (error) {
    console.error("[createClubBookingInvitesAction]", error);
    return { ok: false, error: mapRpcError(error.message ?? "") };
  }

  const rows = (Array.isArray(data) ? data : []) as InviteRow[];
  if (rows.length === 0) {
    return { ok: false, error: "Aucune place libre à inviter sur ce créneau." };
  }

  revalidatePath(`/${locale}/club/slots`, "page");

  return { ok: true, invites: mapRows(rows) };
}

export async function refreshClubBookingInvitesAction(input: {
  locale: string;
  bookingId: string;
}): Promise<ClubInviteActionResult<{ invites: BookingSplitInvite[] }>> {
  const locale = input.locale?.trim() || "fr";
  const bookingId = input.bookingId?.trim();
  if (!bookingId) return { ok: false, error: "Réservation introuvable." };

  const staff = await assertStaffForBooking(bookingId);
  if (!staff.ok) return staff;

  const { data, error } = await staff.supabase.rpc("refresh_club_booking_split_invite_links", {
    p_booking_id: bookingId,
  });

  if (error) {
    console.error("[refreshClubBookingInvitesAction]", error);
    return { ok: false, error: mapRpcError(error.message ?? "") };
  }

  const rows = (Array.isArray(data) ? data : []) as InviteRow[];
  if (rows.length === 0) {
    return { ok: false, error: "Aucune invitation active à regénérer." };
  }

  revalidatePath(`/${locale}/club/slots`, "page");

  return { ok: true, invites: mapRows(rows) };
}
