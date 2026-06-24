export type BookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      error: string;
      code:
        | "BLACKLISTED"
        | "RESTRICTED_REQUIRES_ONLINE"
        | "SLOT_TAKEN"
        | "SLOT_PAST"
        | "UNAUTHORIZED"
        | "SERVER_ERROR"
        | "PLAYER_SUSPENDED"
        | "INSUFFICIENT_BALANCE"
        | "PLAYER_HAS_PENDING_DEBT";
    };

export type CreateBookingInput = {
  clubId: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  paymentMethod: "wallet" | "on_site" | "online";
  racketRentalQty?: number;
  clientTotalHint?: number;
};
