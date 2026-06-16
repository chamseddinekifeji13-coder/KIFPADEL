import type { SupabaseClient } from "@supabase/supabase-js";

import { isPhoneE164VerifiedByAnotherUser } from "@/lib/phone/phone-duplicate-guard";

export async function applyVerifiedPhoneToProfile(
  userClient: SupabaseClient,
  userId: string,
  phoneE164: string,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  if (await isPhoneE164VerifiedByAnotherUser(phoneE164, userId)) {
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
