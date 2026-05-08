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
    profile: string;
  };
}>;

export function MainNav({ locale, labels }: MainNavProps) {
  const pathname = usePathname();
  
  const items = [
    { href: `/${locale}`, label: labels.home, icon: Home },
    { href: `/${locale}/play-now`, label: labels.play, icon: Trophy },
    { href: `/${locale}/find-players`, label: labels.find, icon: Search },
    { href: `/${locale}/book`, label: labels.book, icon: Calendar },
    { href: `/${locale}/profile`, label: labels.profile, icon: User },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg animate-fade-in"
    >
      <div className="glass-gold rounded-[2rem] p-2 flex justify-between items-center px-4 h-20 shadow-premium">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== `/${locale}` && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 transition-all duration-300 min-h-14 min-w-[64px] rounded-2xl group",
                active ? "text-gold" : "text-foreground-muted hover:text-white"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                active ? "bg-gold/10 scale-110 shadow-gold/20 border border-gold/20" : "group-hover:bg-white/5"
              )}>
                <Icon
                  aria-hidden="true"
                  className={cn("h-6 w-6 transition-all", active ? "fill-gold/10" : "")}
                />
              </div>
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-[0.15em] transition-all",
                  active ? "opacity-100" : "opacity-0 scale-90",
                )}
              >
                {item.label}
              </span>
              {active && (
                <div
                  aria-hidden="true"
                  className="absolute -bottom-1 h-1 w-4 bg-gold rounded-full shadow-gold"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
