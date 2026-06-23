"use server";

import { revalidatePath } from "next/cache";

import {
  PLAYER_AVATAR_BUCKET,
  playerAvatarObjectPath,
  validatePlayerAvatarFile,
} from "@/lib/storage/player-avatar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export type UploadPlayerAvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: string };

export async function uploadPlayerAvatarAction(
  formData: FormData,
): Promise<UploadPlayerAvatarResult> {
  try {
    const fileEntry = formData.get("avatar_file");

    if (!(fileEntry instanceof File)) {
      return { ok: false, error: "Choisissez une image à téléverser." };
    }

    const parsed = validatePlayerAvatarFile(fileEntry);
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

    const admin = createSupabaseAdminClient();
    const objectPath = playerAvatarObjectPath(user.id, parsed.ext);
    const bytes = new Uint8Array(await fileEntry.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(PLAYER_AVATAR_BUCKET)
      .upload(objectPath, bytes, {
        contentType: parsed.mimeType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[uploadPlayerAvatarAction] storage upload failed", uploadError);
      return {
        ok: false,
        error: "Échec du téléversement. Réessayez avec une autre photo.",
      };
    }

    const { data: publicUrlData } = admin.storage
      .from(PLAYER_AVATAR_BUCKET)
      .getPublicUrl(objectPath);
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        avatar_url: avatarUrl,
      },
    });

    if (authError) {
      console.error("[uploadPlayerAvatarAction] auth metadata update failed", authError);
      return { ok: false, error: "Photo enregistrée mais profil non mis à jour." };
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn("[uploadPlayerAvatarAction] session refresh failed", refreshError.message);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (profileError) {
      console.warn(
        "[uploadPlayerAvatarAction] profiles.avatar_url update skipped",
        profileError.message,
      );
    }

    for (const loc of ["fr", "en"]) {
      revalidatePath(`/${loc}/profile`);
      revalidatePath(`/${loc}/profile/edit`);
      revalidatePath(`/${loc}/find-players`);
      revalidatePath(`/${loc}/dashboard`);
      revalidatePath(`/${loc}/onboarding`);
    }

    return { ok: true, avatarUrl };
  } catch (err) {
    console.error("[uploadPlayerAvatarAction] unexpected error", err);
    return {
      ok: false,
      error: "Une erreur est survenue pendant l'envoi. Réessayez dans un instant.",
    };
  }
}
