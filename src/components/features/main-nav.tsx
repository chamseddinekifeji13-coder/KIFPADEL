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

function isImmersiveMobileFlow(pathname: string): boolean {
  // Réservation terrain : barre fixe + sheet — la nav flottante intercepte les taps sur mobile.
  if (/^\/(fr|en)\/book\/[^/]+/.test(pathname)) return true;
  if (/^\/(fr|en)\/auth\//.test(pathname)) return true;
  return false;
}

export function MainNav({ locale, labels }: MainNavProps) {
  const pathname = usePathname().replace(/\/$/, "") || "/";

  if (isImmersiveMobileFlow(pathname)) {
    return null;
  }

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
      className="fixed inset-x-[4%] bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg animate-fade-in max-md:animate-none"
    >
      <div className="glass-gold rounded-[2rem] p-2 flex justify-between items-center px-4 h-20 shadow-premium max-md:backdrop-blur-none">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== `/${locale}` && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap-target relative flex flex-col items-center justify-center gap-1.5 min-h-14 min-w-[64px] rounded-2xl group",
                active ? "text-gold" : "text-foreground-muted hover:text-white"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-[background-color,transform,border-color] duration-150",
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
