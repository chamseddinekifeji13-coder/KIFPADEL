import { PLAYER_AVATAR_MAX_BYTES } from "@/lib/storage/player-avatar";

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;
const SKIP_COMPRESS_BELOW_BYTES = 400_000;

/** Réduit une photo (selfie / galerie) avant envoi — évite la limite Server Action (~1 Mo). */
export async function compressAvatarImage(file: File): Promise<File> {
  if (
    file.size <= SKIP_COMPRESS_BELOW_BYTES &&
    /^image\/(jpeg|png|webp)$/i.test(file.type)
  ) {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error(
      "Impossible de lire cette image. Essayez une photo JPEG ou PNG, ou choisissez depuis la galerie.",
    );
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Compression impossible sur cet appareil.");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!blob) {
      throw new Error("Compression de l'image échouée.");
    }

    if (blob.size > PLAYER_AVATAR_MAX_BYTES) {
      throw new Error("Image trop lourde — maximum 2 Mo après compression.");
    }

    return new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
