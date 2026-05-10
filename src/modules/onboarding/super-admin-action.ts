"use server";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

function normalizeSecret(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
}

function getConfiguredSecret() {
  const candidates = [
    process.env.SUPER_ADMIN_ONBOARDING_KEY,
    process.env.SUPER_ADMIN_SECRET,
    process.env.ADMIN_ONBOARDING_KEY,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return normalizeSecret(candidate);
    }
  }

  return "";
}

function signSuperAdminCookie(userId: string, secret: string) {
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export async function completeSuperAdminOnboardingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const secret = normalizeSecret(String(formData.get("secret") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim();

  const expectedSecret = getConfiguredSecret();
  if (!expectedSecret) {
    redirect(`/${locale}/onboarding/super-admin?error=feature_not_configured`);
  }

  if (!secret || secret !== expectedSecret) {
    redirect(`/${locale}/onboarding/super-admin?error=invalid_secret`);
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/onboarding/super-admin`);
  }

  const adminClient = createSupabaseAdminClient();
  const { data: beforeRole } = await adminClient
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  const profileUpdate = displayName
    ? { display_name: displayName, global_role: "super_admin" }
    : { global_role: "super_admin" };

  const { error: roleUpdateError } = await adminClient
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (roleUpdateError) {
    console.error("[completeSuperAdminOnboardingAction] role promotion failed", roleUpdateError);
    redirect(`/${locale}/onboarding/super-admin?error=setup_failed`);
  }

  try {
    const { insertAuditRow } = await import("@/modules/admin/audit-log");
    await insertAuditRow(adminClient, {
      actor_profile_id: user.id,
      actor_global_role: "super_admin",
      action: "SUPER_ADMIN_GRANTED",
      target_table: "profiles",
      target_id: user.id,
      metadata: {
        previous_global_role: beforeRole?.global_role ?? null,
        source: "onboarding_secret",
      },
    });
  } catch (err) {
    console.warn("[completeSuperAdminOnboardingAction] audit_log optional insert failed", err);
  }

  // Reliable fallback: signed cookie-based admin bootstrap.
  const cookieStore = await cookies();
  const signature = signSuperAdminCookie(user.id, expectedSecret);
  cookieStore.set("kif_super_admin", `${user.id}.${signature}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(`/${locale}/admin?onboarded=1`);
}
