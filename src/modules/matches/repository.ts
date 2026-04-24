import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function fetchOpenMatchesByClub(clubId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("matches")
    .select("id, starts_at, club_id, status")
    .eq("club_id", clubId)
    .eq("status", "open");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
