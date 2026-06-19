"use server";

import { revalidatePath } from "next/cache";

import {
  CLUB_LOGO_BUCKET,
  clubLogoObjectPath,
  validateClubLogoFile,
} from "@/lib/storage/club-logo";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { assertClubStaffCanManage } from "@/modules/clubs/actions/club-staff-guard";

export type UploadClubLogoResult =
  | { ok: true; logoUrl: string }
  | { ok: false; error: string };

export async function uploadClubLogoAction(formData: FormData): Promise<UploadClubLogoResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const fileEntry = formData.get("logo_file");

  if (!clubId) {
    return { ok: false, error: "Club introuvable." };
  }

  if (!(fileEntry instanceof File)) {
    return { ok: false, error: "Choisissez une image à téléverser." };
  }

  const parsed = validateClubLogoFile(fileEntry);
  if (!parsed.ok) {
    return parsed;
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Vous devez être connecté." };
  }

  const guard = await assertClubStaffCanManage(supabase, clubId, user.id);
  if (!guard.ok) {
    return { ok: false, error: "Vous n’avez pas le droit de modifier ce club." };
  }

  const objectPath = clubLogoObjectPath(clubId, parsed.ext);
  const bytes = new Uint8Array(await fileEntry.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CLUB_LOGO_BUCKET)
    .upload(objectPath, bytes, {
      contentType: parsed.mimeType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[uploadClubLogoAction] storage upload failed", uploadError);
    return {
      ok: false,
      error: "Échec du téléversement. Réessayez ou utilisez une URL externe.",
    };
  }

  const { data: publicUrlData } = supabase.storage.from(CLUB_LOGO_BUCKET).getPublicUrl(objectPath);
  const logoUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("clubs")
    .update({ logo_url: logoUrl })
    .eq("id", clubId);

  if (updateError) {
    console.error("[uploadClubLogoAction] clubs update failed", updateError);
    return { ok: false, error: "Logo téléversé mais enregistrement en base échoué." };
  }

  revalidatePath(`/${locale}/club/settings`, "page");
  revalidatePath(`/${locale}/club/dashboard`, "page");
  revalidatePath(`/${locale}/book/${clubId}`, "page");
  revalidatePath(`/${locale}/book`, "page");
  revalidatePath(`/${locale}/clubs`, "page");

  return { ok: true, logoUrl };
}
