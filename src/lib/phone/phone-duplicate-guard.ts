import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Vérifie si un numéro E.164 est déjà confirmé sur un autre compte.
 */
export async function isPhoneE164VerifiedByAnotherUser(
  phoneE164: string,
  excludeUserId?: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("profiles")
    .select("id")
    .eq("phone_e164", phoneE164)
    .not("phone_verified_at", "is", null);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[isPhoneE164VerifiedByAnotherUser]", error.message);
    return true;
  }

  return Boolean(data?.id);
}
