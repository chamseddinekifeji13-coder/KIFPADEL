"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/ui/cn";

type MainNavProps = Readonly<{
  locale: string;
  labels: {
    home: string;
    play: string;
    find: string;
    book: string;
    dashboard: string;
  };
}>;

export function MainNav({ locale, labels }: MainNavProps) {
  const pathname = usePathname();
  const items = [
    { href: `/${locale}`, label: labels.home },
    { href: `/${locale}/play-now`, label: labels.play },
    { href: `/${locale}/find-players`, label: labels.find },
    { href: `/${locale}/book`, label: labels.book },
    { href: `/${locale}/dashboard`, label: labels.dashboard },
  ];

  return (
    <nav className="sticky bottom-0 z-20 mt-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-xl px-2 text-center text-[11px] font-medium transition",
                  active
                    ? "bg-sky-100 text-sky-800"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
