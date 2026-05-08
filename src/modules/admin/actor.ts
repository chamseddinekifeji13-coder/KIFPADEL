import type { SupabaseClient } from "@supabase/supabase-js";

export type SuperAdminActor = {
  userId: string;
  /** profiles.global_role (text / enum canonical) */
  globalRole: string | null;
};

export async function getSuperAdminActor(supabase: SupabaseClient): Promise<SuperAdminActor | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: isSa, error: rpcError } = await supabase.rpc("is_super_admin");

  if (rpcError) {
    console.warn("[getSuperAdminActor] is_super_admin rpc", rpcError.message);
    return null;
  }

  if (isSa !== true) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  const gr = profile?.global_role;
  const globalRole =
    typeof gr === "string" ? gr : gr != null && typeof (gr as { toString(): string }).toString === "function"
      ? String(gr)
      : null;

  return { userId: user.id, globalRole };
}
