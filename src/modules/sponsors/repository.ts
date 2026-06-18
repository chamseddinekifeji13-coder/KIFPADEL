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
