"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SPONSOR_LOGO_BUCKET,
  sponsorLogoObjectPath,
  validateSponsorLogoFile,
} from "@/lib/storage/sponsor-logo";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { getSuperAdminActor } from "@/modules/admin/actor";
import { insertAuditRow } from "@/modules/admin/audit-log";
import { updateSponsorPatch } from "@/modules/sponsors/repository";

export type UploadSponsorLogoResult =
  | { ok: true; logoUrl: string }
  | { ok: false; error: string };

export async function uploadSponsorLogoForSponsor(
  supabase: SupabaseClient,
  sponsorId: string,
  file: File,
): Promise<UploadSponsorLogoResult> {
  const parsed = validateSponsorLogoFile(file);
  if (!parsed.ok) {
    return parsed;
  }

  const objectPath = sponsorLogoObjectPath(sponsorId, parsed.ext);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(SPONSOR_LOGO_BUCKET)
    .upload(objectPath, bytes, {
      contentType: parsed.mimeType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[uploadSponsorLogoForSponsor] storage upload failed", uploadError);
    return {
      ok: false,
      error: "Échec du téléversement. Réessayez ou utilisez une URL externe.",
    };
  }

  const { data: publicUrlData } = supabase.storage.from(SPONSOR_LOGO_BUCKET).getPublicUrl(objectPath);
  return { ok: true, logoUrl: publicUrlData.publicUrl };
}

export async function uploadSponsorLogoAction(formData: FormData): Promise<UploadSponsorLogoResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const sponsorId = String(formData.get("sponsor_id") ?? "").trim();
  const fileEntry = formData.get("logo_file");

  if (!sponsorId) {
    return { ok: false, error: "Sponsor introuvable." };
  }

  if (!(fileEntry instanceof File)) {
    return { ok: false, error: "Choisissez une image à téléverser." };
  }

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) {
    return { ok: false, error: "Accès refusé." };
  }

  const upload = await uploadSponsorLogoForSponsor(supabase, sponsorId, fileEntry);
  if (!upload.ok) {
    return upload;
  }

  try {
    await updateSponsorPatch(supabase, { id: sponsorId, logo_url: upload.logoUrl });

    await insertAuditRow(supabase, {
      actor_profile_id: actor.userId,
      actor_global_role: actor.globalRole,
      action: "SPONSOR_LOGO_UPLOAD",
      target_table: "sponsors",
      target_id: sponsorId,
      metadata: { logo_url: upload.logoUrl },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec.";
    console.warn("[uploadSponsorLogoAction]", msg);
    return { ok: false, error: "Logo téléversé mais enregistrement en base échoué." };
  }

  revalidatePath(`/${locale}/admin/sponsors`);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/profile`);

  return { ok: true, logoUrl: upload.logoUrl };
}
