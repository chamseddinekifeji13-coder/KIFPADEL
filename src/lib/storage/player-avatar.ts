export const PLAYER_AVATAR_BUCKET = "player-avatars";

/** 2 Mo — aligné sur file_size_limit du bucket Supabase. */
export const PLAYER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const PLAYER_AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function playerAvatarObjectPath(userId: string, ext: string): string {
  return `${userId}/avatar.${ext}`;
}

export function resolvePlayerAvatarExtension(mimeType: string): string | null {
  return PLAYER_AVATAR_MIME_TO_EXT[mimeType] ?? null;
}

function inferMimeTypeFromFilename(filename: string): string | null {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

export function validatePlayerAvatarFile(
  file: File,
): { ok: true; ext: string; mimeType: string } | { ok: false; error: string } {
  if (!file || file.size === 0) {
    return { ok: false, error: "Choisissez une image." };
  }

  if (file.size > PLAYER_AVATAR_MAX_BYTES) {
    return { ok: false, error: "Image trop lourde — maximum 2 Mo." };
  }

  const mimeType =
    file.type.trim().toLowerCase() || inferMimeTypeFromFilename(file.name) || "";
  const ext = resolvePlayerAvatarExtension(mimeType);

  if (!ext) {
    return {
      ok: false,
      error: "Format non supporté — utilisez PNG, JPEG ou WebP.",
    };
  }

  return { ok: true, ext, mimeType };
}
