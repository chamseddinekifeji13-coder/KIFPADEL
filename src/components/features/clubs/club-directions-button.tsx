"use client";

import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  type ClubDirectionsInput,
  buildGoogleMapsDirectionsUrl,
} from "@/lib/utils/club-directions";

type ClubDirectionsButtonProps = {
  club: ClubDirectionsInput;
  /** Si fourni (ex. Maps avec origine GPS), remplace l’URL construite depuis `club`. */
  href?: string;
  label: string;
  className?: string;
  variant?: "primary" | "outline";
};

/** Opens Google Maps directions in a new tab (no JS SDK, no API key). */
export function ClubDirectionsButton({
  club,
  href: hrefProp,
  label,
  className,
  variant = "outline",
}: ClubDirectionsButtonProps) {
  const href = hrefProp ?? buildGoogleMapsDirectionsUrl(club);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors",
        variant === "primary" &&
          "bg-sky-600 text-white hover:bg-sky-700",
        variant === "outline" &&
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        className,
      )}
    >
      <Navigation className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </a>
  );
}
