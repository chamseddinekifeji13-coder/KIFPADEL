"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { 
  Home, 
  Trophy, 
  Search, 
  Calendar, 
  User 
} from "lucide-react";

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
    { href: `/${locale}`, label: labels.home, icon: Home },
    { href: `/${locale}/play-now`, label: labels.play, icon: Trophy },
    { href: `/${locale}/find-players`, label: labels.find, icon: Search },
    { href: `/${locale}/book`, label: labels.book, icon: Calendar },
    { href: `/${locale}/profile`, label: labels.dashboard, icon: User },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
    >
      <div className="bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-2 shadow-2xl shadow-sky-900/10 flex justify-between items-center px-4 h-16">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-all duration-300 min-h-11 min-w-11 px-3",
                active ? "text-sky-600 scale-110" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("h-5 w-5 transition-all", active ? "fill-sky-600/10" : "")}
              />
              <span
                aria-hidden={!active}
                className={cn(
                  "text-[9px] font-bold uppercase tracking-tighter transition-all",
                  active ? "opacity-100" : "opacity-0 h-0",
                )}
              >
                {item.label}
              </span>
              {active && (
                <div
                  aria-hidden="true"
                  className="absolute -bottom-1 h-1 w-1 bg-sky-600 rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
