import {
  PLAYER_AVATAR_BUCKET,
  playerAvatarObjectPath,
} from "@/lib/storage/player-avatar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const AVATAR_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/** URL publique si un fichier avatar existe dans Storage (sans colonne profiles). */
export async function resolveStoredPlayerAvatarUrl(userId: string): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: files, error } = await admin.storage.from(PLAYER_AVATAR_BUCKET).list(userId, {
      limit: 10,
    });

    if (error || !files?.length) {
      return null;
    }

    const avatarFile = files.find((file) =>
      AVATAR_EXTENSIONS.some((ext) => file.name === `avatar.${ext}`),
    );
    if (!avatarFile) {
      return null;
    }

    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const { data } = admin.storage
      .from(PLAYER_AVATAR_BUCKET)
      .getPublicUrl(playerAvatarObjectPath(userId, ext));

    return data.publicUrl || null;
  } catch (err) {
    console.warn("[resolveStoredPlayerAvatarUrl]", err);
    return null;
  }
}
