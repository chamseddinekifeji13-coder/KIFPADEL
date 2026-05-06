import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  slot_duration_minutes: number;
  opening_time: string;
  closing_time: string;
  created_at: string;
}

type ClubRow = Partial<Club> & {
  id: string;
  name: string;
  city?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  type?: string | null;
  logo_url?: string | null;
  slot_duration_minutes?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
  is_indoor?: boolean | null;
};

function normalizeClub(row: ClubRow): Club {
  const normalizedType =
    row.type ??
    (row.is_indoor === true ? "Indoor" : "Outdoor");

  return {
    id: row.id,
    name: row.name,
    city: row.city?.trim() || "Tunis",
    type: normalizedType as Club["type"],
    logo_url: row.logo_url ?? null,
    is_active: row.is_active ?? true,
    slot_duration_minutes: row.slot_duration_minutes ?? 90,
    opening_time: row.opening_time ?? "08:00:00",
    closing_time: row.closing_time ?? "23:00:00",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export async function fetchClubs(city?: string): Promise<Club[]> {
  try {
    const normalizedCity = city?.trim();
    const supabase = await createSupabaseServerClient();

    let request = supabase.from("clubs").select("*");

    if (normalizedCity) {
      request = request.ilike("city", `%${normalizedCity}%`);
    }

    request = request.eq("is_active", true);

    const { data, error } = await request.order("name", { ascending: true });

    if (!error && Array.isArray(data)) {
      return data.map((club) => normalizeClub(club as ClubRow));
    }

    if (error) {
      console.warn("[clubs.fetchClubs] supabase error", error.message);
    }

    // Fallback: bypass RLS to avoid an empty clubs page when policies are misconfigured.
    const adminClient = createSupabaseAdminClient();
    let adminRequest = adminClient.from("clubs").select("*").eq("is_active", true);

    if (normalizedCity) {
      adminRequest = adminRequest.ilike("city", `%${normalizedCity}%`);
    }

    const { data: adminData, error: adminError } = await adminRequest.order("name", {
      ascending: true,
    });

    if (adminError) {
      console.warn("[clubs.fetchClubs] admin fallback error", adminError.message);
      return [];
    }

    return Array.isArray(adminData)
      ? adminData.map((club) => normalizeClub(club as ClubRow))
      : [];
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

export async function fetchManagedClubForUser(userId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("club_memberships")
      .select(
        `
          role,
          club:clubs (
            id,
            name,
            city,
            is_active
          )
        `,
      )
      .eq("user_id", userId)
      .in("role", ["club_manager", "club_staff", "platform_admin"])
      .limit(1);

    if (error) {
      console.warn("[clubs.fetchManagedClubForUser] supabase error", error.message);
      return null;
    }

    const membership = Array.isArray(data) ? data[0] : null;
    const clubRecord = membership?.club;
    const club = Array.isArray(clubRecord) ? clubRecord[0] : clubRecord;

    if (!club?.id || !club?.name) {
      return null;
    }

    return {
      id: club.id,
      name: club.name,
      city: club.city ?? "Tunis",
      is_active: club.is_active ?? true,
    };
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[clubs.fetchManagedClubForUser] unexpected error", err);
    return null;
  }
}
