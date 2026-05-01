"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

/**
 * Local fallback assets (lives under /public/images).
 * Use these for "core UI" defaults when a remote URL is broken,
 * unauthorized, or missing. True user uploads still flow through
 * the original `src` (e.g. Vercel Blob or Supabase Storage).
 */
export const FALLBACK_AVATAR = "/images/avatar-placeholder.jpg";
export const FALLBACK_CLUB = "/images/club-placeholder.jpg";

type SafeImageProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
  /** Local fallback path served from /public. */
  fallbackSrc: string;
};

/**
 * `next/image` wrapper that gracefully falls back to a local /public asset
 * when the remote image (typically Vercel Blob or Supabase Storage) is
 * inaccessible — broken link, 401/403, deleted blob, network error, etc.
 *
 * It also avoids passing an empty / null `src` to `next/image` (which throws).
 */
export function SafeImage({ src, fallbackSrc, alt, ...props }: SafeImageProps) {
  const initial = src && src.trim().length > 0 ? src : fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState<string>(initial);

  // If the parent passes a new `src` (e.g. user uploads a new avatar),
  // reset to the new remote URL so we re-attempt loading it.
  useEffect(() => {
    setCurrentSrc(src && src.trim().length > 0 ? src : fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
