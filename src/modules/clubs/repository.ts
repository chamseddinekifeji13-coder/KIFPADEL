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
  /** Adresse précise pour les itinéraires (rue, quartier…) — optionnel. */
  address: string | null;
  /** Nombre de terrains couverts (valeur indicative affichée aux joueurs). */
  indoor_courts_count: number;
  /** Nombre de terrains extérieurs. */
  outdoor_courts_count: number;
  /** Responsable / contact principal — optionnel. */
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
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
  address?: string | null;
  indoor_courts_count?: number | null;
  outdoor_courts_count?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
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
const MANAGED_CLUB_ROLES = ["club_manager", "club_admin", "club_staff", "platform_admin"] as const;

type ManagedClubMembership = {
  role?: string | null;
  club?: ClubRow | ClubRow[] | null;
};

/** Club géré par un compte staff / manager (formulaire paramètres inclus). */
export type ManagedClubBranding = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  indoor_courts_count: number;
  outdoor_courts_count: number;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
};

function normalizeClub(row: ClubRow): Club {
  const normalizedType =
    row.type ??
    (row.is_indoor === true ? "Indoor" : "Outdoor");

  const addr = row.address?.trim();
  const indoor = Math.max(0, Math.floor(row.indoor_courts_count ?? 0));
  const outdoor = Math.max(0, Math.floor(row.outdoor_courts_count ?? 0));
  const cn = row.contact_name?.trim();
  const cp = row.contact_phone?.trim();
  const ce = row.contact_email?.trim();
  return {
    id: row.id,
    name: row.name,
    city: row.city?.trim() || "Tunis",
    address: addr && addr.length > 0 ? addr : null,
    indoor_courts_count: indoor,
    outdoor_courts_count: outdoor,
    contact_name: cn && cn.length > 0 ? cn : null,
    contact_phone: cp && cp.length > 0 ? cp : null,
    contact_email: ce && ce.length > 0 ? ce : null,
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

export async function fetchClubById(id: string): Promise<Club | null> {
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

    if (!data || typeof data !== "object" || !("id" in data)) {
      return null;
    }

    return normalizeClub(data as ClubRow);
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

async function fetchPrimaryClubForUser(userId: string): Promise<ManagedClubBranding | null> {
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

    if (!profile) {
      continue;
    }

    const mainClubId = (profile as { main_club_id?: string | null }).main_club_id;
    if (!mainClubId) {
      return null;
    }

    const { data: clubRow, error: clubError } = await adminClient
      .from("clubs")
      .select(
        "id,name,city,address,indoor_courts_count,outdoor_courts_count,contact_name,contact_phone,contact_email,is_active",
      )
      .eq("id", mainClubId)
      .maybeSingle();

    if (clubError || !clubRow?.id || !clubRow?.name) {
      return null;
    }

    const club = normalizeClub(clubRow as ClubRow);
    return {
      id: club.id,
      name: club.name,
      city: club.city,
      address: club.address,
      indoor_courts_count: club.indoor_courts_count,
      outdoor_courts_count: club.outdoor_courts_count,
      contact_name: club.contact_name,
      contact_phone: club.contact_phone,
      contact_email: club.contact_email,
      is_active: club.is_active,
    };
  }

  return null;
}

export async function fetchManagedClubForUser(userId: string): Promise<ManagedClubBranding | null> {
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
              address,
              indoor_courts_count,
              outdoor_courts_count,
              contact_name,
              contact_phone,
              contact_email,
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
      return null;
    }

    const clubRecord = membership?.club;
    const club = Array.isArray(clubRecord) ? clubRecord[0] : clubRecord;

    if (!club?.id || !club?.name) {
      return fetchPrimaryClubForUser(userId);
    }

    const addr = typeof club.address === "string" ? club.address.trim() : "";
    const indoor = Math.max(0, Math.floor(Number(club.indoor_courts_count) || 0));
    const outdoor = Math.max(0, Math.floor(Number(club.outdoor_courts_count) || 0));
    const cn = typeof club.contact_name === "string" ? club.contact_name.trim() : "";
    const cp = typeof club.contact_phone === "string" ? club.contact_phone.trim() : "";
    const ce = typeof club.contact_email === "string" ? club.contact_email.trim() : "";
    return {
      id: club.id,
      name: club.name,
      city: club.city ?? "Tunis",
      address: addr.length > 0 ? addr : null,
      indoor_courts_count: indoor,
      outdoor_courts_count: outdoor,
      contact_name: cn.length > 0 ? cn : null,
      contact_phone: cp.length > 0 ? cp : null,
      contact_email: ce.length > 0 ? ce : null,
      is_active: club.is_active ?? true,
    };
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[clubs.fetchManagedClubForUser] unexpected error", err);
    return null;
  }
}
