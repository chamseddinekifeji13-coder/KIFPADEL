"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

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

  // Session utilisateur + RLS (profiles_update_self) : pas de repli qui supprime le genre.
  const { data: updatedRows, error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName, gender })
    .eq("id", user.id)
    .select("id");

  if (profileError) {
    console.error("[updateProfileAction] profile update", profileError.message, profileError);
    redirect(`/${locale}/profile/edit?error=update_failed`);
  }

  if (!updatedRows?.length) {
    console.error("[updateProfileAction] no profile row updated for user", user.id);
    redirect(`/${locale}/profile/edit?error=update_failed`);
  }

  const currentEmail = normalizeEmail(user.email ?? "");
  if (email !== currentEmail) {
    type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
    type EmailUpdateResult = Awaited<
      ReturnType<AdminClient["auth"]["admin"]["updateUserById"]>
    >;
    let authEmailError: EmailUpdateResult["error"] | null;
    authEmailError = null;
    try {
      const adminClient = createSupabaseAdminClient();
      const result = await adminClient.auth.admin.updateUserById(user.id, {
        email,
        email_confirm: true,
      });
      authEmailError = result.error;
    } catch (err) {
      console.error(
        "[updateProfileAction] admin email sync threw (e.g. missing SUPABASE_SERVICE_ROLE_KEY or transient failure)",
        err,
      );
      redirect(`/${locale}/profile/edit?error=email_update_failed`);
    }

    if (authEmailError) {
      console.error("[updateProfileAction] auth email update failed", authEmailError);
      redirect(`/${locale}/profile/edit?error=email_update_failed`);
    }
  }

  // Profil dénormalisé : ignorer l’échec si la colonne n’existe pas en prod.
  await supabase.from("profiles").update({ email }).eq("id", user.id);

  redirect(`/${locale}/profile/edit?status=updated`);
}
