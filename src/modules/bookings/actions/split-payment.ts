"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import type { BookingSplitInvite } from "@/modules/bookings/split-payment-repository";

export type SplitPaymentActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

type CreateInvitesRow = {
  invite_id: string;
  seat_index: number;
  invite_token: string;
  share_price: number;
  expires_at: string;
};

export async function createBookingSplitInvitesAction(input: {
  locale: string;
  bookingId: string;
}): Promise<SplitPaymentActionResult<{ invites: BookingSplitInvite[] }>> {
  const locale = input.locale?.trim() || "fr";
  const bookingId = input.bookingId?.trim();

  if (!bookingId) {
    return { ok: false, error: "Réservation introuvable." };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const { data, error } = await supabase.rpc("create_booking_split_invites", {
    p_booking_id: bookingId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("NOT_ORGANIZER")) {
      return { ok: false, error: "Seul un participant peut générer des liens de paiement." };
    }
    if (msg.includes("BOOKING_NOT_FOUND")) {
      return { ok: false, error: "Réservation introuvable ou annulée." };
    }
    console.error("[createBookingSplitInvitesAction]", error);
    return { ok: false, error: "Impossible de créer les invitations." };
  }

  const rows = (Array.isArray(data) ? data : []) as CreateInvitesRow[];
  const invites: BookingSplitInvite[] = rows.map((row) => ({
    inviteId: String(row.invite_id),
    seatIndex: Number(row.seat_index),
    inviteToken: String(row.invite_token),
    sharePrice: Number(row.share_price),
    expiresAt: String(row.expires_at),
    status: "pending",
  }));

  revalidatePath(`/${locale}/bookings/${bookingId}/invites`, "page");

  return { ok: true, invites };
}

export async function acceptBookingInviteAction(input: {
  locale: string;
  inviteId: string;
  token: string;
  paymentMethod: "wallet" | "on_site";
}): Promise<SplitPaymentActionResult<{ bookingId: string }>> {
  const locale = input.locale?.trim() || "fr";
  const inviteId = input.inviteId?.trim();
  const token = input.token?.trim();

  if (!inviteId || !token) {
    return { ok: false, error: "Lien d'invitation invalide." };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const { data, error } = await supabase.rpc("accept_booking_invite_atomic", {
    p_invite_id: inviteId,
    p_raw_token: token,
    p_payment_method: input.paymentMethod,
  });

  if (error) {
    console.error("[acceptBookingInviteAction]", error);
    return { ok: false, error: "Paiement impossible. Réessayez." };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    ok?: boolean;
    booking_id?: string;
    error_code?: string;
    error_message?: string;
  } | null;

  if (!row?.ok || !row.booking_id) {
    const code = row?.error_code ?? "";
    if (code === "INSUFFICIENT_BALANCE") {
      return { ok: false, error: "Solde Jetons KIF insuffisant." };
    }
    if (code === "EXPIRED") {
      return { ok: false, error: "Cette invitation a expiré." };
    }
    if (code === "INVALID_TOKEN") {
      return { ok: false, error: "Lien invalide ou incomplet." };
    }
    if (code === "ALREADY_JOINED") {
      return { ok: false, error: "Vous êtes déjà inscrit sur ce créneau." };
    }
    return { ok: false, error: row?.error_message ?? "Invitation refusée." };
  }

  revalidatePath(`/${locale}/bookings`, "page");
  revalidatePath(`/${locale}/bookings/invite/${inviteId}`, "page");
  revalidatePath(`/${locale}/profile/wallet`, "page");

  return { ok: true, bookingId: String(row.booking_id) };
}
