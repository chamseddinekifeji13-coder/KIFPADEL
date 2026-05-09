/**
 * Dashboard & lists for authenticated Super Admins (RLS gated).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export type PlatformDashboardStats = {
  clubCount: number;
  profileCount: number;
  bookingsLast7Days: number;
  tournamentsOpenCount: number;
  incidentsRecentCount: number;
};

export async function fetchPlatformDashboardStats(): Promise<PlatformDashboardStats | null> {
  const supabase = await createSupabaseServerClient();
  try {
    const since7d = new Date(Date.now() - 7 * 864e5).toISOString();
    const since30d = new Date(Date.now() - 30 * 864e5).toISOString();

    const [{ count: clubCount }, { count: profileCount }, bookingFetch, { count: tCount }, incRes] =
      await Promise.all([
        supabase.from("clubs").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("starts_at", since7d),
        supabase
          .from("tournaments")
          .select("id", { count: "exact", head: true })
          .in("status", ["registration_open", "in_progress"]),
        supabase.from("incidents").select("id", { count: "exact", head: true }).gte("created_at", since30d),
      ]);

    return {
      clubCount: clubCount ?? 0,
      profileCount: profileCount ?? 0,
      bookingsLast7Days: bookingFetch.count ?? 0,
      tournamentsOpenCount: tCount ?? 0,
      incidentsRecentCount: incRes.count ?? 0,
    };
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchPlatformDashboardStats]", err);
    return null;
  }
}

export type AdminClubRow = {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  /** Last booking `starts_at` at this venue (cheap signal). */
  last_booking_starts_at: string | null;
};

export async function fetchAdminClubDirectory(): Promise<AdminClubRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("clubs")
      .select("id,name,city,is_active,suspended_at,suspension_reason,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[admin.fetchAdminClubDirectory]", error.message);
      return [];
    }

    const rows = (data ?? []) as Omit<AdminClubRow, "last_booking_starts_at">[];
    const clubIds = rows.map((r) => r.id);
    const lastBookings = new Map<string, string>();

    const chunkSize = 25;
    for (let i = 0; i < clubIds.length; i += chunkSize) {
      const slice = clubIds.slice(i, i + chunkSize);
      if (slice.length === 0) continue;
      const { data: bRows } = await supabase.from("bookings").select("club_id,starts_at").in("club_id", slice);
      const list = (bRows ?? []) as { club_id: string; starts_at: string }[];
      for (const row of list) {
        const prev = lastBookings.get(row.club_id);
        const t = row.starts_at;
        if (!prev || t > prev) {
          lastBookings.set(row.club_id, t);
        }
      }
    }

    return rows.map((r) => ({
      ...r,
      last_booking_starts_at: lastBookings.get(r.id) ?? null,
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchAdminClubDirectory]", err);
    return [];
  }
}

export type AdminPlayerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  main_club_id: string | null;
  main_club_name: string | null;
  league: string | null;
  sport_rating: number | null;
  trust_score: number | null;
  reliability_status: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string | null;
};

export async function fetchAdminPlayersList(params: {
  search?: string | null;
  limit?: number;
}): Promise<AdminPlayerRow[]> {
  const supabase = await createSupabaseServerClient();
  const limit = Math.min(200, Math.max(10, params.limit ?? 50));
  const rawQ = (params.search ?? "").trim();
  const q = rawQ.replace(/,/g, " ");

  try {
    let qb = supabase
      .from("profiles")
      .select(
        "id,display_name,email,phone,main_club_id,league,sport_rating,trust_score,reliability_status,suspended_at,suspension_reason,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q.length > 0) {
      const pat = `%${q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      qb = qb.or(`display_name.ilike.${pat},email.ilike.${pat},phone.ilike.${pat}`);
    }

    const { data, error } = await qb;

    if (error) {
      console.warn("[admin.fetchAdminPlayersList]", error.message);
      return [];
    }

    const base = (data ?? []) as Omit<AdminPlayerRow, "main_club_name">[];
    const clubIds = [...new Set(base.map((p) => p.main_club_id).filter(Boolean))] as string[];
    const clubNameById = new Map<string, string>();
    if (clubIds.length > 0) {
      const { data: clubs } = await supabase.from("clubs").select("id,name").in("id", clubIds);
      (clubs ?? []).forEach((c: { id: string; name: string }) => clubNameById.set(c.id, c.name));
    }

    return base.map((p) => ({
      ...p,
      main_club_name: p.main_club_id ? (clubNameById.get(p.main_club_id) ?? null) : null,
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchAdminPlayersList]", err);
    return [];
  }
}

export type AdminIncidentRow = {
  id: string;
  club_id: string;
  player_id: string;
  reason: string;
  created_at: string;
  created_by: string;
  club_name: string | null;
  player_display_name: string | null;
};

export async function fetchAdminIncidents(limit = 100): Promise<AdminIncidentRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("incidents")
      .select("id,club_id,player_id,reason,created_at,created_by")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[admin.fetchAdminIncidents]", error.message);
      return [];
    }

    const rows = (data ?? []) as Omit<AdminIncidentRow, "club_name" | "player_display_name">[];
    const clubIds = [...new Set(rows.map((r) => r.club_id))];
    const playerIds = [...new Set(rows.map((r) => r.player_id))];

    const [{ data: clubs }, { data: profiles }] = await Promise.all([
      clubIds.length ? supabase.from("clubs").select("id,name").in("id", clubIds) : { data: [] as { id: string; name: string }[] },
      playerIds.length
        ? supabase.from("profiles").select("id,display_name").in("id", playerIds)
        : { data: [] as { id: string; display_name: string | null }[] },
    ]);

    const clubName = new Map((clubs ?? []).map((c) => [c.id as string, c.name as string]));
    const playerName = new Map(
      (profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? null]),
    );

    return rows.map((r) => ({
      ...r,
      club_name: clubName.get(r.club_id) ?? null,
      player_display_name: playerName.get(r.player_id) ?? null,
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchAdminIncidents]", err);
    return [];
  }
}

export type AdminTrustEventRow = {
  id: string;
  player_id: string;
  kind: string;
  delta: number;
  booking_id: string | null;
  created_at: string;
  player_display_name: string | null;
};

export async function fetchAdminTrustEventsRecent(limit = 80): Promise<AdminTrustEventRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("trust_events")
      .select("id,player_id,kind,delta,booking_id,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[admin.fetchAdminTrustEventsRecent]", error.message);
      return [];
    }

    const rows = (data ?? []) as Omit<AdminTrustEventRow, "player_display_name">[];
    const playerIds = [...new Set(rows.map((r) => r.player_id))];
    const { data: profiles } = playerIds.length
      ? await supabase.from("profiles").select("id,display_name").in("id", playerIds)
      : { data: [] as { id: string; display_name: string | null }[] };

    const playerName = new Map(
      (profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? null]),
    );

    return rows.map((r) => ({
      ...r,
      player_display_name: playerName.get(r.player_id) ?? null,
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchAdminTrustEventsRecent]", err);
    return [];
  }
}

export type AdminTournamentRow = {
  id: string;
  title: string;
  status: string;
  club_id: string;
  tournament_scope: string;
  starts_at: string | null;
  created_at: string;
  club_name: string | null;
};

export async function fetchAdminTournaments(limit = 150): Promise<AdminTournamentRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id,title,status,club_id,tournament_scope,starts_at,created_at, clubs(name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[admin.fetchAdminTournaments]", error.message);
      return [];
    }

    return (data ?? []).map((raw: Record<string, unknown>) => {
      const clubsRel = raw.clubs as { name?: string } | { name?: string }[] | undefined;
      const c = Array.isArray(clubsRel) ? clubsRel[0] : clubsRel;
      return {
        id: String(raw.id),
        title: String(raw.title),
        status: String(raw.status),
        club_id: String(raw.club_id),
        tournament_scope: raw.tournament_scope != null ? String(raw.tournament_scope) : "single_club",
        starts_at: raw.starts_at != null ? String(raw.starts_at) : null,
        created_at: String(raw.created_at),
        club_name: c?.name?.trim() ?? null,
      };
    });
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchAdminTournaments]", err);
    return [];
  }
}

export type AdminClubSelectOption = {
  id: string;
  name: string;
  city: string;
};

/** Clubs actifs pour formulaire “club hôte” (tournois plateforme). */
export async function fetchActiveClubsForSelect(): Promise<AdminClubSelectOption[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("clubs")
      .select("id,name,city")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.warn("[admin.fetchActiveClubsForSelect]", error.message);
      return [];
    }

    return (data ?? []).map((r) => ({
      id: String((r as { id: string }).id),
      name: String((r as { name: string | null }).name ?? "").trim() || "Club",
      city: String((r as { city: string | null }).city ?? "").trim(),
    }));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchActiveClubsForSelect]", err);
    return [];
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeIlikeToken(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type AuditLogListEntry = {
  id: string;
  created_at: string;
  actor_profile_id: string | null;
  actor_global_role: string | null;
  actor_display_name: string | null;
  actor_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
};

export async function fetchAuditLogEntries(params: {
  /** Exact match against `audit_log.action`. */
  action?: string | null;
  /** Exact match against `audit_log.target_table`. */
  targetTable?: string | null;
  /** Free-text: UUID scans `target_id` / `actor_profile_id`; otherwise ilike action + target_table. */
  q?: string | null;
  limit?: number | null;
}): Promise<AuditLogListEntry[]> {
  const supabase = await createSupabaseServerClient();
  const limit = Math.min(100, Math.max(10, Number(params.limit) || 75));

  const action = params.action?.trim() || "";
  const targetTable = params.targetTable?.trim() || "";
  const rawQ = params.q?.trim() || "";

  try {
    let qb = supabase
      .from("audit_log")
      .select("id,created_at,actor_profile_id,actor_global_role,action,target_table,target_id,metadata")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action.length > 0) {
      qb = qb.eq("action", action);
    }
    if (targetTable.length > 0) {
      qb = qb.eq("target_table", targetTable);
    }

    if (rawQ.length > 0) {
      if (UUID_RE.test(rawQ)) {
        qb = qb.or(`target_id.eq.${rawQ},actor_profile_id.eq.${rawQ}`);
      } else {
        const pat = `%${escapeIlikeToken(rawQ)}%`;
        qb = qb.or(`action.ilike.${pat},target_table.ilike.${pat}`);
      }
    }

    const { data, error } = await qb;

    if (error) {
      console.warn("[admin.fetchAuditLogEntries]", error.message);
      return [];
    }

    const rows = (data ?? []) as Array<{
      id: string;
      created_at: string;
      actor_profile_id: string | null;
      actor_global_role: string | null;
      action: string;
      target_table: string | null;
      target_id: string | null;
      metadata: Record<string, unknown> | null;
    }>;

    const actorIds = [...new Set(rows.map((r) => r.actor_profile_id).filter(Boolean))] as string[];
    let profileById = new Map<
      string,
      { display_name: string | null; email: string | null }
    >();

    if (actorIds.length > 0) {
      const { data: actors } = await supabase.from("profiles").select("id,display_name,email").in("id", actorIds);
      profileById = new Map(
        (actors ?? []).map((row) => [
          row.id as string,
          {
            display_name: (row.display_name as string | null) ?? null,
            email: (row.email as string | null) ?? null,
          },
        ]),
      );
    }

    return rows.map((r) => {
      const meta =
        r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata) ? r.metadata : {};
      const ap = r.actor_profile_id ? profileById.get(r.actor_profile_id) : undefined;
      return {
        id: String(r.id),
        created_at: String(r.created_at),
        actor_profile_id: r.actor_profile_id,
        actor_global_role: r.actor_global_role,
        actor_display_name: ap?.display_name ?? null,
        actor_email: ap?.email ?? null,
        action: String(r.action ?? ""),
        target_table:
          typeof r.target_table === "string"
            ? r.target_table.trim()
            : r.target_table != null
              ? String(r.target_table)
              : null,
        target_id:
          typeof r.target_id === "string" ? r.target_id.trim() : r.target_id != null ? String(r.target_id) : null,
        metadata: meta as Record<string, unknown>,
      };
    });
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[admin.fetchAuditLogEntries]", err);
    return [];
  }
}
