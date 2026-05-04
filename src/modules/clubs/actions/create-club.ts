"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function createClubAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!name || !city) {
    redirect(`/${locale}/clubs/new?error=missing_fields`);
  }

  const supabase = await createSupabaseServerActionClient();
  const adminClient = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/clubs/new`);
  }

  // Create club with service role to bypass restrictive RLS defaults.
  const { data: createdClub, error: clubError } = await adminClient
    .from("clubs")
    .insert({
      name,
      city,
      is_active: true,
    })
    .select("id")
    .single();

  if (clubError || !createdClub) {
    console.error("[createClubAction] club creation failed", clubError);
    redirect(`/${locale}/clubs/new?error=create_failed`);
  }

  const clubId = createdClub.id as string;

  // Avoid upsert conflict metadata dependency; insert first, then fallback update.
  const { error: membershipInsertError } = await adminClient.from("club_memberships").insert({
    club_id: clubId,
    player_id: user.id,
    role: "club_manager",
    is_primary: true,
  });

  if (membershipInsertError) {
    const { data: existingMembership, error: membershipReadError } = await adminClient
      .from("club_memberships")
      .select("id")
      .eq("club_id", clubId)
      .eq("player_id", user.id)
      .maybeSingle();

    if (membershipReadError || !existingMembership?.id) {
      console.error("[createClubAction] membership creation failed", membershipInsertError);
      await adminClient.from("clubs").delete().eq("id", clubId);
      redirect(`/${locale}/clubs/new?error=membership_failed`);
    }

    const { error: membershipUpdateError } = await adminClient
      .from("club_memberships")
      .update({ role: "club_manager", is_primary: true })
      .eq("id", existingMembership.id);

    if (membershipUpdateError) {
      console.error("[createClubAction] membership update failed", membershipUpdateError);
      await adminClient.from("clubs").delete().eq("id", clubId);
      redirect(`/${locale}/clubs/new?error=membership_failed`);
    }
  }

  await adminClient
    .from("profiles")
    .update({ main_club_id: clubId })
    .eq("id", user.id)
    .is("main_club_id", null);

  redirect(`/${locale}/club/dashboard?created=1`);
}
