import type { SupabaseClient } from "@supabase/supabase-js";

import type { BookingTotals } from "@/modules/bookings/pricing-service";

type DirectBookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      error: string;
      code: "SLOT_TAKEN" | "UNAUTHORIZED" | "SERVER_ERROR";
    };

const STALE_PENDING_MS = 15 * 60 * 1000;

type DirectBookingInput = {
  clubId: string;
  courtId: string;
  playerId: string;
  startsAt: string;
  endsAt: string;
  paymentMethod: "online" | "on_site";
  bookingStatus: string;
  totals: BookingTotals;
  includeRacketColumns: boolean;
};

async function hasBlockingOverlap(
  supabase: SupabaseClient,
  courtId: string,
  startsAt: string,
  endsAt: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, created_at")
    .eq("court_id", courtId)
    .neq("status", "cancelled")
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt);

  if (error) {
    console.error("[createBookingDirect] overlap check failed", error.message);
    throw new Error("OVERLAP_CHECK_FAILED");
  }

  const now = Date.now();
  return (data ?? []).some((row) => {
    const status = String(row.status ?? "");
    if (status !== "pending") return true;
    const createdAt = new Date(String(row.created_at ?? "")).getTime();
    if (!Number.isFinite(createdAt)) return true;
    return now - createdAt < STALE_PENDING_MS;
  });
}

/**
 * Repli si la RPC `create_booking_atomic` échoue ou renvoie une réponse incohérente.
 * Utilise les policies RLS (`created_by = auth.uid()`).
 */
export async function createBookingDirect(
  supabase: SupabaseClient,
  input: DirectBookingInput,
): Promise<DirectBookingResult> {
  try {
    if (await hasBlockingOverlap(supabase, input.courtId, input.startsAt, input.endsAt)) {
      return {
        ok: false,
        error: "Ce créneau est déjà réservé. Veuillez en choisir un autre.",
        code: "SLOT_TAKEN",
      };
    }
  } catch {
    return {
      ok: false,
      error: "Impossible de vérifier la disponibilité du créneau. Réessayez.",
      code: "SERVER_ERROR",
    };
  }

  const base = {
    club_id: input.clubId,
    court_id: input.courtId,
    created_by: input.playerId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    status: input.bookingStatus,
  };

  const attempts: Record<string, unknown>[] = [
    {
      ...base,
      total_price: input.totals.totalPrice,
      payment_method: input.paymentMethod,
    },
    { ...base, total_price: input.totals.totalPrice },
    { ...base, payment_method: input.paymentMethod },
    { ...base },
  ];

  if (input.includeRacketColumns && input.totals.racketRentalQty > 0) {
    attempts.unshift({
      ...base,
      total_price: input.totals.totalPrice,
      payment_method: input.paymentMethod,
      racket_rental_qty: input.totals.racketRentalQty,
      racket_rental_fee: input.totals.racketFee,
    });
  }

  const seen = new Set<string>();
  let lastMessage = "Impossible d'enregistrer la réservation.";

  for (const payload of attempts) {
    const key = JSON.stringify(payload);
    if (seen.has(key)) continue;
    seen.add(key);

    const { data, error } = await supabase.from("bookings").insert(payload).select("id").single();

    if (!error && data?.id) {
      return { ok: true, bookingId: String(data.id) };
    }

    if (error?.message) {
      lastMessage = error.message;
      const code = error.code ?? "";
      if (code === "23P01" || /overlap|exclusion/i.test(error.message)) {
        return {
          ok: false,
          error: "Ce créneau est déjà réservé. Veuillez en choisir un autre.",
          code: "SLOT_TAKEN",
        };
      }
    }
  }

  console.error("[createBookingDirect] all insert attempts failed", lastMessage);
  return {
    ok: false,
    error: `Réservation refusée : ${lastMessage}`,
    code: "SERVER_ERROR",
  };
}
