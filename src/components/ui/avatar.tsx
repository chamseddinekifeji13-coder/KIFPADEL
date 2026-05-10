"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Avatar({
  src,
  alt = "",
  fallback,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-16 w-16 text-base",
  };

  // Track the exact remote URL that failed. When `src` changes, the new URL
  // automatically gets another chance without a state reset effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const normalizedSrc = src?.trim() ?? "";
  const hasUsableSrc = normalizedSrc.length > 0 && normalizedSrc !== failedSrc;

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-slate-100 border border-slate-200/50",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {hasUsableSrc ? (
        <Image
          src={normalizedSrc}
          alt={alt}
          fill
          className="aspect-square object-cover"
          onError={() => setFailedSrc(normalizedSrc)}
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-medium text-slate-500 uppercase">
          {fallback || alt.charAt(0) || "?"}
        </div>
      )}
    </div>
  );
}
