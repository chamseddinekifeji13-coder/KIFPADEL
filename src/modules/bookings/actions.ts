"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { requireActionUser } from "@/lib/supabase/action-auth";
import { reliabilityFromTrustScore } from "@/domain/rules/trust";
import { createBookingForUser } from "@/modules/bookings/create-booking-service";
import type { BookingResult, CreateBookingInput } from "@/modules/bookings/create-booking-types";

export type { BookingResult, CreateBookingInput };

export async function createBookingAction(input: CreateBookingInput): Promise<BookingResult> {
  const supabase = await createSupabaseServerActionClient();

  const auth = await requireActionUser(supabase);
  if ("error" in auth) {
    return {
      ok: false,
      error: "Session expirée. Déconnectez-vous puis reconnectez-vous.",
      code: "UNAUTHORIZED",
    };
  }

  const result = await createBookingForUser(supabase, auth.user, input);

  if (result.ok && input.paymentMethod === "wallet") {
    revalidatePath("/fr/profile/wallet");
    revalidatePath("/en/profile/wallet");
  }

  return result;
}

export async function getPlayerTrustInfo(): Promise<{
  trustScore: number;
  reliability: "healthy" | "warning" | "restricted" | "blacklisted";
} | null> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("trust_score").eq("id", user.id).single();

  if (!profile) return null;

  const trustScore = profile.trust_score ?? 70;
  return {
    trustScore,
    reliability: reliabilityFromTrustScore(trustScore),
  };
}
