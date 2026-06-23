import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isPhoneE164VerifiedByAnotherUser } from "@/lib/phone/phone-duplicate-guard";
import { revalidatePhoneVerificationPaths } from "@/modules/phone-verification/revalidate-phone-paths";

export async function applyVerifiedPhoneToProfile(
  _userClient: SupabaseClient,
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

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("apply_verified_phone_profile", {
    p_user_id: userId,
    p_phone_e164: phoneE164,
  });

  if (error) {
    console.error("[applyVerifiedPhoneToProfile] rpc failed", error.message);
    return { ok: false, error: "Numéro non enregistré. Réessayez.", code: "SERVER_ERROR" };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    ok?: boolean;
    error_code?: string;
    error_message?: string;
  } | null;

  if (!row?.ok) {
    if (row?.error_code === "PHONE_IN_USE") {
      return {
        ok: false,
        error: "Ce numéro est déjà utilisé par un autre compte.",
        code: "PHONE_IN_USE",
      };
    }
    return {
      ok: false,
      error: row?.error_message ?? "Numéro non enregistré. Réessayez.",
      code: row?.error_code ?? "SERVER_ERROR",
    };
  }

  revalidatePhoneVerificationPaths();
  return { ok: true };
}
