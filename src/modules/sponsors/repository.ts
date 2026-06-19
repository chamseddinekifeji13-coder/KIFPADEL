/**
 * Sponsor rows for Super Admin tooling (RLS-enforced reads/writes).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export type SponsorRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
};

function mapSponsorRow(r: Record<string, unknown>): SponsorRow {
  return {
    id: String(r.id),
    name: String(r.name),
    logo_url: r.logo_url != null ? String(r.logo_url) : null,
    website_url: r.website_url != null ? String(r.website_url) : null,
    is_active: Boolean(r.is_active),
    position: Number(r.position ?? 0),
    created_at: String(r.created_at),
  };
}

/** Sponsors actifs pour l’affichage joueur (RLS : is_active uniquement). */
export async function listActiveSponsorsForPublic(): Promise<SponsorRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("sponsors")
      .select("id, name, logo_url, website_url, is_active, position, created_at")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[sponsors.listActiveSponsorsForPublic]", error.message);
      return [];
    }

    return (data ?? []).map((r) => mapSponsorRow(r as Record<string, unknown>));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[sponsors.listActiveSponsorsForPublic]", err);
    return [];
  }
}

export async function listAllSponsorsForAdmin(): Promise<SponsorRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("sponsors")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[sponsors.listAllSponsorsForAdmin]", error.message);
      return [];
    }

    return (data ?? []).map((r) => mapSponsorRow(r as Record<string, unknown>));
  } catch (err) {
    rethrowFrameworkError(err);
    console.warn("[sponsors.listAllSponsorsForAdmin]", err);
    return [];
  }
}

export async function insertSponsorRow(
  supabase: SupabaseClient,
  input: {
    name: string;
    logo_url: string | null;
    website_url: string | null;
    position: number;
    is_active: boolean;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("sponsors")
    .insert({
      name: input.name,
      logo_url: input.logo_url,
      website_url: input.website_url,
      position: input.position,
      is_active: input.is_active,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "insert failed");

  return String((data as { id: string }).id);
}

export async function linkSponsorsToTournament(
  supabase: SupabaseClient,
  tournamentId: string,
  sponsorIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(sponsorIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return;
  }

  const { data: rows, error: fetchError } = await supabase
    .from("sponsors")
    .select("id, position")
    .in("id", uniqueIds)
    .eq("is_active", true);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const valid = (rows ?? []) as { id: string; position: number }[];
  if (valid.length === 0) {
    return;
  }

  const positionById = new Map(valid.map((row) => [row.id, row.position]));
  const ordered = uniqueIds.filter((id) => positionById.has(id));

  const { error } = await supabase.from("tournament_sponsors").insert(
    ordered.map((sponsorId, index) => ({
      tournament_id: tournamentId,
      sponsor_id: sponsorId,
      position: positionById.get(sponsorId) ?? index,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

/** Remplace les sponsors liés à un tournoi (vide = sponsors globaux sur l'écran TV). */
export async function replaceTournamentSponsors(
  supabase: SupabaseClient,
  tournamentId: string,
  sponsorIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("tournament_sponsors")
    .delete()
    .eq("tournament_id", tournamentId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await linkSponsorsToTournament(supabase, tournamentId, sponsorIds);
}

/** Sponsors du tournoi ; sinon sponsors globaux actifs. */
export async function listSponsorsForTournamentDisplay(tournamentId: string): Promise<SponsorRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("tournament_sponsors")
      .select(
        "position, sponsors(id, name, logo_url, website_url, is_active, position, created_at)",
      )
      .eq("tournament_id", tournamentId)
      .order("position", { ascending: true });

    if (error) {
      console.warn("[sponsors.listSponsorsForTournamentDisplay]", error.message);
      return listActiveSponsorsForPublic();
    }

    const linked = (data ?? [])
      .map((raw) => {
        const row = raw as {
          position?: number;
          sponsors?: Record<string, unknown> | Record<string, unknown>[] | null;
        };
        const sponsor = Array.isArray(row.sponsors) ? row.sponsors[0] : row.sponsors;
        if (!sponsor || sponsor.is_active === false) {
          return null;
        }
        return mapSponsorRow(sponsor);
      })
      .filter((s): s is SponsorRow => s != null);

    if (linked.length > 0) {
      return linked;
    }

    return listActiveSponsorsForPublic();
  } catch (err) {
    rethrowFrameworkError(err);
    return listActiveSponsorsForPublic();
  }
}

export async function listSponsorsLinkedToTournament(tournamentId: string): Promise<SponsorRow[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("tournament_sponsors")
      .select(
        "position, sponsors(id, name, logo_url, website_url, is_active, position, created_at)",
      )
      .eq("tournament_id", tournamentId)
      .order("position", { ascending: true });

    if (error) {
      console.warn("[sponsors.listSponsorsLinkedToTournament]", error.message);
      return [];
    }

    return (data ?? [])
      .map((raw) => {
        const row = raw as {
          sponsors?: Record<string, unknown> | Record<string, unknown>[] | null;
        };
        const sponsor = Array.isArray(row.sponsors) ? row.sponsors[0] : row.sponsors;
        if (!sponsor) {
          return null;
        }
        return mapSponsorRow(sponsor);
      })
      .filter((s): s is SponsorRow => s != null);
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function updateSponsorPatch(
  supabase: SupabaseClient,
  input: {
    id: string;
    name?: string;
    logo_url?: string | null;
    website_url?: string | null;
    position?: number;
    is_active?: boolean;
  },
) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.logo_url !== undefined) patch.logo_url = input.logo_url;
  if (input.website_url !== undefined) patch.website_url = input.website_url;
  if (input.position !== undefined) patch.position = input.position;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { error } = await supabase.from("sponsors").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);
}
