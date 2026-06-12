import type { SupabaseClient } from "@supabase/supabase-js";

import type { BookingTotals } from "@/modules/bookings/pricing-service";

type DirectBookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      error: string;
      code: "SLOT_TAKEN" | "UNAUTHORIZED" | "SERVER_ERROR";
    };

/**
 * Phase 2 : la création passe par la RPC `create_booking_atomic` (join slot).
 * Ce repli ne doit plus insérer une réservation « terrain entier ».
 */
export async function createBookingDirect(
  _supabase: SupabaseClient,
  _input: {
    clubId: string;
    courtId: string;
    playerId: string;
    startsAt: string;
    endsAt: string;
    paymentMethod: "online" | "on_site";
    bookingStatus: string;
    totals: BookingTotals;
    includeRacketColumns: boolean;
  },
): Promise<DirectBookingResult> {
  return {
    ok: false,
    error:
      "Réservation indisponible sans la migration Phase 2 (booking_participants). Réessayez ou contactez le support.",
    code: "SERVER_ERROR",
  };
}
