import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

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
  created_at: string;
}

export async function fetchClubs(city?: string): Promise<Club[]> {
  try {
    const supabase = await createSupabaseServerClient();

    let request = supabase.from("clubs").select("*");

    if (city) {
      request = request.eq("city", city);
    }

    const { data, error } = await request.order("name");

    if (error) {
      console.warn("[clubs.fetchClubs] supabase error", error.message);
      return [];
    }

    return Array.isArray(data) ? (data as Club[]) : [];
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[clubs.fetchClubs] unexpected error", err);
    return [];
  }
}

export async function fetchClubById(id: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.warn("[clubs.fetchClubById] supabase error", error.message);
      return null;
    }

    return data;
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[clubs.fetchClubById] unexpected error", err);
    return null;
  }
}

export async function fetchCourtsByClub(clubId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("courts")
      .select("*")
      .eq("club_id", clubId)
      .eq("is_active", true);

    if (error) {
      console.warn("[clubs.fetchCourtsByClub] supabase error", error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[clubs.fetchCourtsByClub] unexpected error", err);
    return [];
  }
}
