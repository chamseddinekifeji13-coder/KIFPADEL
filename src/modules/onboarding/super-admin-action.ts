"use server";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
    // Fallback for misconfigured environments.
    process.env.NEXT_PUBLIC_SUPER_ADMIN_ONBOARDING_KEY,
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

  if (displayName) {
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
  }

  // Role promotion.
  await supabase.from("profiles").update({ global_role: "super_admin" }).eq("id", user.id);

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
