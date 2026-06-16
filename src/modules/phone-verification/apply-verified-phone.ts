import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function applyVerifiedPhoneToProfile(
  userClient: SupabaseClient,
  userId: string,
  phoneE164: string,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const admin = createSupabaseAdminClient();

  const { data: duplicate } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_e164", phoneE164)
    .not("phone_verified_at", "is", null)
    .neq("id", userId)
    .maybeSingle();

  if (duplicate?.id) {
    return {
      ok: false,
      error: "Ce numéro est déjà utilisé par un autre compte.",
      code: "PHONE_IN_USE",
    };
  }

  const nowIso = new Date().toISOString();
  const localDisplay = phoneE164.replace(/^\+216/, "");

  const { error: profileErr } = await userClient
    .from("profiles")
    .update({
      phone: localDisplay,
      phone_e164: phoneE164,
      phone_verified_at: nowIso,
      verification_level: 2,
    })
    .eq("id", userId);

  if (profileErr) {
    console.error("[applyVerifiedPhoneToProfile]", profileErr.message);
    return { ok: false, error: "Numéro non enregistré. Réessayez.", code: "SERVER_ERROR" };
  }

  return { ok: true };
}
