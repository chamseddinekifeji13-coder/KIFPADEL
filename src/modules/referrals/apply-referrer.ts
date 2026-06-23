import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseReferrerIdParam } from "@/lib/referrals/referral-url";

/** Enregistre le parrain une seule fois (idempotent). */
export async function applyReferrerToProfile(
  userId: string,
  rawReferrerId: string | null | undefined,
): Promise<void> {
  const referrerId = parseReferrerIdParam(rawReferrerId);
  if (!referrerId || referrerId === userId) return;

  try {
    const admin = createSupabaseAdminClient();

    const { data: referrer } = await admin.from("profiles").select("id").eq("id", referrerId).maybeSingle();
    if (!referrer?.id) return;

    const { data: existing } = await admin
      .from("profiles")
      .select("referred_by_user_id")
      .eq("id", userId)
      .maybeSingle();

    if (existing?.referred_by_user_id) return;

    await admin.from("profiles").update({ referred_by_user_id: referrerId }).eq("id", userId);
  } catch (err) {
    console.warn("[applyReferrerToProfile] failed", err);
  }
}
