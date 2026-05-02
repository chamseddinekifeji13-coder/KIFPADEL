import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Repository for Club related database operations.
 */
export interface Club {
  id: string;
  name: string;
  city: string;
  type: "Outdoor" | "Indoor";
  logo_url: string | null;
  is_active: boolean;
  slot_duration_minutes: number;
  opening_time: string;
  closing_time: string;
  created_at: string;
}

export async function fetchClubs(city?: string): Promise<Club[]> {

  const supabase = await createSupabaseServerClient();

  let request = supabase.from("clubs").select("*");

  if (city) {
    request = request.eq("city", city);
  }

  const { data, error } = await request.order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function fetchClubById(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function fetchCourtsByClub(clubId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("courts")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

