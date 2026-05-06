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

type CourtRow = {
  id: string;
  club_id: string;
  label: string;
  surface?: string | null;
  is_indoor?: boolean | null;
  is_active?: boolean | null;
  price_per_slot?: number | null;
  created_at?: string | null;
};

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

const MEMBERSHIP_USER_COLUMNS = ["player_id", "user_id"] as const;
const MANAGED_CLUB_ROLES = [
  "club_manager",
  "club_admin",
  "manager",
  "admin",
  "owner",
  "club_staff",
  "platform_admin",
] as const;

type ManagedClubMembership = {
  role?: string | null;
  club?: ClubRow | ClubRow[] | null;
};

type ManagedClubSummary = {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
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
    slot_duration_minutes: row.slot_duration_minutes ?? 60,
    opening_time: row.opening_time ?? "08:00:00",
    closing_time: row.closing_time ?? "23:00:00",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

function filterActiveCourts(courts: CourtRow[]) {
  return courts.filter((court) => court.is_active !== false);
}

async function ensureDefaultCourtForClub(clubId: string): Promise<CourtRow[]> {
  const adminClient = createSupabaseAdminClient();

  const { data: existingCourts, error: existingCourtsError } = await adminClient
    .from("courts")
    .select("*")
    .eq("club_id", clubId);

  if (existingCourtsError) {
    console.warn("[clubs.ensureDefaultCourtForClub] lookup error", existingCourtsError.message);
    return [];
  }

  const activeCourts = filterActiveCourts((existingCourts ?? []) as CourtRow[]);
  if (activeCourts.length > 0) {
    return activeCourts;
  }

  const { data: createdCourt, error: createCourtError } = await adminClient
    .from("courts")
    .insert({
      club_id: clubId,
      label: "Terrain 1",
      surface: "standard",
      is_indoor: false,
    })
    .select("*")
    .single();

  if (createCourtError || !createdCourt) {
    console.warn("[clubs.ensureDefaultCourtForClub] create error", createCourtError?.message);
    return [];
  }

  return [createdCourt as CourtRow];
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
      .eq("club_id", clubId);

    if (!error && Array.isArray(data)) {
      const activeCourts = filterActiveCourts(data as CourtRow[]);
      if (activeCourts.length > 0) {
        return activeCourts;
      }
    }

    if (error) {
      console.warn("[clubs.fetchCourtsByClub] supabase error", error.message);
    }

    return ensureDefaultCourtForClub(clubId);
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[clubs.fetchCourtsByClub] unexpected error", err);
    return [];
  }
}

async function fetchPrimaryClubForUser(userId: string): Promise<ManagedClubSummary | null> {
  const adminClient = createSupabaseAdminClient();

  for (const profileKey of ["id", "user_id"] as const) {
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("main_club_id")
      .eq(profileKey, userId)
      .maybeSingle();

    if (profileError) {
      continue;
    }

    const mainClubId = (profile as { main_club_id?: string | null } | null)?.main_club_id;
    if (!mainClubId) {
      return null;
    }

    const { data: club, error: clubError } = await adminClient
      .from("clubs")
      .select("id,name,city,is_active")
      .eq("id", mainClubId)
      .maybeSingle();

    if (clubError || !club?.id || !club?.name) {
      return null;
    }

    return {
      id: club.id,
      name: club.name,
      city: club.city ?? "Tunis",
      is_active: club.is_active ?? true,
    };
  }

  return null;
}

export async function fetchManagedClubForUser(userId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    let membership: ManagedClubMembership | null = null;
    const lookupErrors: string[] = [];

    for (const userColumn of MEMBERSHIP_USER_COLUMNS) {
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
        .eq(userColumn, userId)
        .in("role", [...MANAGED_CLUB_ROLES])
        .limit(1);

      if (error) {
        lookupErrors.push(`${userColumn}: ${error.message}`);
        continue;
      }

      membership = Array.isArray(data)
        ? (data[0] as ManagedClubMembership | undefined) ?? null
        : null;

      if (membership) {
        break;
      }
    }

    if (!membership) {
      if (lookupErrors.length === MEMBERSHIP_USER_COLUMNS.length) {
        console.warn("[clubs.fetchManagedClubForUser] lookup errors", lookupErrors);
      }
      return fetchPrimaryClubForUser(userId);
    }

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
