import { buildBookingInviteUrl } from "@/lib/bookings/invite-url";
import type { BookingSplitInvite } from "@/modules/bookings/split-payment-repository";

const tokensKey = (bookingId: string) => `booking-invites:${bookingId}`;

export type StoredBookingInvite = {
  inviteId: string;
  token: string;
  url: string;
  expiresAt?: string;
};

export function loadStoredBookingInvites(bookingId: string): StoredBookingInvite[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(tokensKey(bookingId)) ?? "[]") as StoredBookingInvite[];
  } catch {
    return [];
  }
}

export function storeBookingInvites(
  bookingId: string,
  items: BookingSplitInvite[],
  origin: string,
  locale: string,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    tokensKey(bookingId),
    JSON.stringify(
      items.map((inv) => ({
        inviteId: inv.inviteId,
        token: inv.inviteToken,
        url: inv.inviteToken
          ? buildBookingInviteUrl(origin, locale, inv.inviteId, inv.inviteToken)
          : "",
        expiresAt: inv.expiresAt,
      })),
    ),
  );
}

export function persistInviteLinks(
  bookingId: string,
  items: { inviteId: string; inviteToken: string; url: string; expiresAt?: string }[],
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    tokensKey(bookingId),
    JSON.stringify(
      items.map((inv) => ({
        inviteId: inv.inviteId,
        token: inv.inviteToken,
        url: inv.url,
        expiresAt: inv.expiresAt,
      })),
    ),
  );
}
