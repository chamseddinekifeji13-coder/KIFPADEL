"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LOCALES } from "@/i18n/config";
import { cn } from "@/lib/utils/cn";

type LocaleSwitcherProps = {
  currentLocale: string;
};

export function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const pathname = usePathname();

  const getLocaleHref = (targetLocale: string) => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return `/${targetLocale}`;
    }
    segments[0] = targetLocale;
    return `/${segments.join("/")}`;
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] p-1 text-[10px] font-bold uppercase tracking-wider"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <Link
            key={locale}
            href={getLocaleHref(locale)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "tap-target min-w-[2.5rem] rounded-full border px-3 py-1 text-center transition-colors touch-manipulation",
              isActive
                ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                : "border-transparent text-[var(--foreground-muted)] [@media(hover:hover)]:hover:text-white active:text-white active:bg-white/5",
            )}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
