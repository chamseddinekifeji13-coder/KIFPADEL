import type { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const CLUB_STAFF_ROLES = new Set(["club_staff", "club_manager", "club_admin", "platform_admin"]);

const MEMBERSHIP_USER_COLUMNS = ["user_id", "player_id"] as const;

type ActionSupabase = Awaited<ReturnType<typeof createSupabaseServerActionClient>>;

async function findStaffMembershipRole(
  supabase: ActionSupabase,
  clubId: string,
  userId: string,
): Promise<string | null> {
  for (const col of MEMBERSHIP_USER_COLUMNS) {
    let qb = supabase.from("club_memberships").select("role").eq("club_id", clubId);
    qb = col === "user_id" ? qb.eq("user_id", userId) : qb.eq("player_id", userId);

    const { data, error } = await qb.maybeSingle();

    if (!error && data?.role) {
      return String(data.role);
    }
  }
  return null;
}

async function superAdminCanManageClub(userId: string, clubId: string): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  for (const profileKey of ["id", "user_id"] as const) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("main_club_id, global_role")
      .eq(profileKey, userId)
      .maybeSingle();

    if (!profile) {
      continue;
    }

    const globalRole = String((profile as { global_role?: string | null }).global_role ?? "").toLowerCase();
    const mainClubId = (profile as { main_club_id?: string | null }).main_club_id;

    if (globalRole === "super_admin" && mainClubId === clubId) {
      return true;
    }
  }

  return false;
}

export async function assertClubStaffCanManage(
  supabase: ActionSupabase,
  clubId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await findStaffMembershipRole(supabase, clubId, userId);

  if (role && CLUB_STAFF_ROLES.has(role)) {
    return { ok: true };
  }

  const { data: isSa, error: rpcError } = await supabase.rpc("is_super_admin");

  if (!rpcError && isSa === true) {
    return { ok: true };
  }

  if (await superAdminCanManageClub(userId, clubId)) {
    return { ok: true };
  }

  return { ok: false, error: "forbidden" };
}

export function clubStaffForbiddenMessage(locale: string): string {
  return locale === "en"
    ? "You are not allowed to manage courts for this club."
    : "Vous n’avez pas le droit de gérer les terrains de ce club.";
}
