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

  const { error: membershipError } = await adminClient.from("club_memberships").upsert(
    {
      club_id: clubId,
      player_id: user.id,
      role: "club_manager",
      is_primary: true,
    },
    {
      onConflict: "club_id,player_id",
    },
  );

  if (membershipError) {
    // Best-effort cleanup to avoid orphan club if membership fails.
    console.error("[createClubAction] membership creation failed", membershipError);
    await adminClient.from("clubs").delete().eq("id", clubId);
    redirect(`/${locale}/clubs/new?error=membership_failed`);
  }

  // Best effort profile update; support both schema variants.
  const updateById = await adminClient
    .from("profiles")
    .update({ main_club_id: clubId })
    .eq("id", user.id)
    .is("main_club_id", null);

  if (updateById.error) {
    await adminClient
      .from("profiles")
      .update({ main_club_id: clubId })
      .eq("user_id", user.id)
      .is("main_club_id", null);
  }

  redirect(`/${locale}/club/dashboard?created=1`);
}
