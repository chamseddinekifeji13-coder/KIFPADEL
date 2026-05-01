"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function createClubAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!name || !city) {
    redirect(`/${locale}/clubs/new?error=missing_fields`);
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/clubs/new`);
  }

  const { data: createdClub, error: clubError } = await supabase
    .from("clubs")
    .insert({
      name,
      city,
      is_active: true,
    })
    .select("id")
    .single();

  if (clubError || !createdClub) {
    redirect(`/${locale}/clubs/new?error=create_failed`);
  }

  const clubId = createdClub.id as string;

  const { error: membershipError } = await supabase.from("club_memberships").upsert(
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
    await supabase.from("clubs").delete().eq("id", clubId);
    redirect(`/${locale}/clubs/new?error=membership_failed`);
  }

  await supabase
    .from("profiles")
    .update({ main_club_id: clubId })
    .eq("user_id", user.id)
    .is("main_club_id", null);

  redirect(`/${locale}/club/dashboard?created=1`);
}
