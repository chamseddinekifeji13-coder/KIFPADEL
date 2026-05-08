"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

const PROFILE_USER_KEYS = ["id", "user_id"] as const;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getSafeLocale(value: FormDataEntryValue | null) {
  return String(value ?? "fr") === "en" ? "en" : "fr";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updateProfileAction(formData: FormData) {
  const locale = getSafeLocale(formData.get("locale"));
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const rawGender = String(formData.get("gender") ?? "").trim();
  const gender =
    rawGender === "male" || rawGender === "female" ? rawGender : null;

  if (!displayName || !email) {
    redirect(`/${locale}/profile/edit?error=missing_fields`);
  }

  if (!isValidEmail(email)) {
    redirect(`/${locale}/profile/edit?error=invalid_email`);
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/profile/edit`);
  }

  const adminClient = createSupabaseAdminClient();
  let profileUpdated = false;
  const profileErrors: unknown[] = [];
  const profileUpdatePayload = { display_name: displayName, gender };

  for (const profileKey of PROFILE_USER_KEYS) {
    const { error } = await adminClient
      .from("profiles")
      .update(profileUpdatePayload)
      .eq(profileKey, user.id);

    if (!error) {
      profileUpdated = true;
      break;
    }

    profileErrors.push({ profileKey, error });
  }

  if (!profileUpdated) {
    const firstMsg = profileErrors.map((e) => JSON.stringify(e)).join(" ");
    if (firstMsg.toLowerCase().includes("gender")) {
      for (const profileKey of PROFILE_USER_KEYS) {
        const { error } = await adminClient
          .from("profiles")
          .update({ display_name: displayName })
          .eq(profileKey, user.id);
        if (!error) {
          profileUpdated = true;
          break;
        }
      }
    }
  }

  if (!profileUpdated) {
    console.error("[updateProfileAction] profile update failed", profileErrors);
    redirect(`/${locale}/profile/edit?error=update_failed`);
  }

  const currentEmail = normalizeEmail(user.email ?? "");
  if (email !== currentEmail) {
    const { error: authEmailError } = await adminClient.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
    });

    if (authEmailError) {
      console.error("[updateProfileAction] auth email update failed", authEmailError);
      redirect(`/${locale}/profile/edit?error=email_update_failed`);
    }
  }

  // Some deployments still keep a denormalized email column on profiles.
  // Ignore failures here because newer schemas may not have that column.
  for (const profileKey of PROFILE_USER_KEYS) {
    await adminClient.from("profiles").update({ email }).eq(profileKey, user.id);
  }

  redirect(`/${locale}/profile/edit?status=updated`);
}
