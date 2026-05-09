import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayerAccessCode = "PLAYER_SUSPENDED" | "PLAYER_HAS_PENDING_DEBT";

const MESSAGES: Record<PlayerAccessCode, string> = {
  PLAYER_SUSPENDED: "Votre compte est suspendu. Contactez KIFPADEL ou le club.",
  PLAYER_HAS_PENDING_DEBT:
    "Vous avez une dette en attente auprès de ce club. Réglez-la avant de réserver.",
};

export class PlayerAccessError extends Error {
  readonly code: PlayerAccessCode;

  constructor(code: PlayerAccessCode, message?: string) {
    super(message ?? MESSAGES[code]);
    this.name = "PlayerAccessError";
    this.code = code;
  }
}

export function isPlayerAccessError(e: unknown): e is PlayerAccessError {
  return e instanceof PlayerAccessError;
}

/**
 * Hard gate: admin suspension on profile (`suspended_at`), independent of trust blacklist.
 */
export async function assertNotSuspended(supabase: SupabaseClient, playerId: string): Promise<void> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("suspended_at")
    .eq("id", playerId)
    .maybeSingle();

  if (error) {
    console.warn("[assertNotSuspended] profile read failed", error.message);
    return;
  }

  if (profile?.suspended_at) {
    throw new PlayerAccessError("PLAYER_SUSPENDED");
  }
}

/**
 * Booking-specific: suspension + pending club-scoped debt. Trust/blacklist rules stay in `createBookingAction`.
 */
export async function assertPlayerCanBook(
  supabase: SupabaseClient,
  params: { playerId: string; clubId: string },
): Promise<void> {
  await assertNotSuspended(supabase, params.playerId);

  const { count, error } = await supabase
    .from("club_debts")
    .select("id", { count: "exact", head: true })
    .eq("player_id", params.playerId)
    .eq("club_id", params.clubId)
    .eq("status", "pending");

  if (error) {
    console.error("[assertPlayerCanBook] club_debts count failed", error.message);
    throw new Error("BOOKING_ELIGIBILITY_CHECK_FAILED");
  }

  if (count !== null && count > 0) {
    throw new PlayerAccessError("PLAYER_HAS_PENDING_DEBT");
  }
}
