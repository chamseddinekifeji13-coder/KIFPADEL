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

function readAuthAvatarFromMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const candidates = [metadata.avatar_url, metadata.picture, metadata.avatar];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/** Résout l'URL affichable pour l'annuaire joueurs (profil → storage → OAuth). */
export async function resolvePlayerAvatarUrlForDirectory(
  userId: string,
  profileAvatarUrl: string | null | undefined,
): Promise<string | null> {
  const fromProfile = profileAvatarUrl?.trim();
  if (fromProfile) return fromProfile;

  const fromStorage = await resolveStoredPlayerAvatarUrl(userId);
  if (fromStorage) return fromStorage;

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) return null;
    return readAuthAvatarFromMetadata(data.user.user_metadata as Record<string, unknown>);
  } catch (err) {
    console.warn("[resolvePlayerAvatarUrlForDirectory] auth lookup failed", err);
    return null;
  }
}

/** Enrichit une liste de joueurs dont avatar_url est vide (find-players, etc.). */
export async function enrichPlayerDirectoryAvatars<T extends { id: string; avatar_url: string | null }>(
  players: T[],
): Promise<T[]> {
  const missing = players.filter((player) => !player.avatar_url?.trim());
  if (missing.length === 0) return players;

  const resolved = await Promise.all(
    missing.map(async (player) => {
      const avatarUrl = await resolvePlayerAvatarUrlForDirectory(player.id, player.avatar_url);
      return avatarUrl ? ([player.id, avatarUrl] as const) : null;
    }),
  );

  const avatarById = new Map(resolved.filter((entry): entry is [string, string] => entry !== null));

  return players.map((player) => {
    const avatarUrl = player.avatar_url?.trim() || avatarById.get(player.id) || null;
    if (avatarUrl === player.avatar_url) return player;
    return { ...player, avatar_url: avatarUrl };
  });
}
