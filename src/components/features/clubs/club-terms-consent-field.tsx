import Link from "next/link";

import { CURRENT_CLUB_TERMS_VERSION } from "@/domain/legal/club-terms";
import { buildClubCharterPath, buildClubPrivacyPath } from "@/lib/legal/club-legal-urls";

type ClubTermsConsentFieldProps = {
  locale: string;
  variant?: "light" | "dark";
  charterLinkLabel: string;
  privacyLinkLabel: string;
  labelBefore: string;
  labelBetween: string;
  labelAfter: string;
  className?: string;
};

export function ClubTermsConsentField({
  locale,
  variant = "light",
  charterLinkLabel,
  privacyLinkLabel,
  labelBefore,
  labelBetween,
  labelAfter,
  className,
}: ClubTermsConsentFieldProps) {
  const textClass = variant === "dark" ? "text-[var(--foreground-muted)]" : "text-slate-600";
  const linkClass =
    variant === "dark"
      ? "font-semibold text-[var(--gold)] underline underline-offset-2"
      : "font-semibold text-sky-700 underline underline-offset-2";

  return (
    <div className={className}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="terms_accepted"
          value="true"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span className={`text-xs leading-relaxed ${textClass}`}>
          {labelBefore}{" "}
          <Link
            href={buildClubCharterPath(locale)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {charterLinkLabel}
          </Link>
          {labelBetween}{" "}
          <Link
            href={buildClubPrivacyPath(locale)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {privacyLinkLabel}
          </Link>
          {labelAfter}
        </span>
      </label>
      <input type="hidden" name="terms_version" value={CURRENT_CLUB_TERMS_VERSION} />
    </div>
  );
}
