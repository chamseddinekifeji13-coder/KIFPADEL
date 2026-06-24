export const SPONSOR_LOGO_BUCKET = "sponsor-logos";

/** 2 Mo — aligné sur file_size_limit du bucket Supabase. */
export const SPONSOR_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const SPONSOR_LOGO_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function sponsorLogoObjectPath(sponsorId: string, ext: string): string {
  return `${sponsorId}/logo.${ext}`;
}

export function resolveSponsorLogoExtension(mimeType: string): string | null {
  return SPONSOR_LOGO_MIME_TO_EXT[mimeType] ?? null;
}

export function validateSponsorLogoFile(
  file: File,
): { ok: true; ext: string; mimeType: string } | { ok: false; error: string } {
  if (!file || file.size === 0) {
    return { ok: false, error: "Choisissez une image à téléverser." };
  }

  if (file.size > SPONSOR_LOGO_MAX_BYTES) {
    return { ok: false, error: "Image trop lourde — maximum 2 Mo." };
  }

  const mimeType = file.type.trim().toLowerCase();
  const ext = resolveSponsorLogoExtension(mimeType);

  if (!ext) {
    return {
      ok: false,
      error: "Format non supporté — utilisez PNG, JPEG, WebP ou GIF.",
    };
  }

  return { ok: true, ext, mimeType };
}
