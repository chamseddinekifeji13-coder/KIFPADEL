export const CLUB_LOGO_BUCKET = "club-logos";

/** 2 Mo — aligné sur file_size_limit du bucket Supabase. */
export const CLUB_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const CLUB_LOGO_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function clubLogoObjectPath(clubId: string, ext: string): string {
  return `${clubId}/logo.${ext}`;
}

export function resolveClubLogoExtension(mimeType: string): string | null {
  return CLUB_LOGO_MIME_TO_EXT[mimeType] ?? null;
}

export function validateClubLogoFile(
  file: File,
): { ok: true; ext: string; mimeType: string } | { ok: false; error: string } {
  if (!file || file.size === 0) {
    return { ok: false, error: "Choisissez une image à téléverser." };
  }

  if (file.size > CLUB_LOGO_MAX_BYTES) {
    return { ok: false, error: "Image trop lourde — maximum 2 Mo." };
  }

  const mimeType = file.type.trim().toLowerCase();
  const ext = resolveClubLogoExtension(mimeType);

  if (!ext) {
    return {
      ok: false,
      error: "Format non supporté — utilisez PNG, JPEG, WebP ou GIF.",
    };
  }

  return { ok: true, ext, mimeType };
}
