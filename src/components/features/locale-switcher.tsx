"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LOCALES } from "@/i18n/config";

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
    <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-medium">
      {LOCALES.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <Link
            key={locale}
            href={getLocaleHref(locale)}
            className={[
              "rounded-full px-3 py-1 transition",
              isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            ].join(" ")}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
