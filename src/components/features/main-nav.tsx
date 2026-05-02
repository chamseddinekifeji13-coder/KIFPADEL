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
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <div className="bg-surface/80 backdrop-blur-2xl border border-gold/10 rounded-[2rem] p-2 shadow-2xl shadow-black flex justify-between items-center px-4 h-16">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-all duration-300 px-3",
                active ? "text-gold scale-110" : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-all", active ? "fill-gold/10" : "")} />
              <span className={cn("text-[9px] font-bold uppercase tracking-tighter transition-all", active ? "opacity-100" : "opacity-0 h-0")}>
                {item.label}
              </span>
              {active && (
                <div className="absolute -bottom-1 h-1 w-1 bg-gold rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
