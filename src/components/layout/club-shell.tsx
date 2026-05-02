"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";

type ClubShellProps = Readonly<{
  children: React.ReactNode;
  locale: string;
  clubName: string;
  navLabels: {
    dashboard: string;
    bookings: string;
    courts: string;
    players: string;
    incidents: string;
    settings: string;
  };
}>;

export function ClubShell({ children, locale, clubName, navLabels }: ClubShellProps) {
  const pathname = usePathname();
  const baseUrl = `/${locale}/club`;

  const navItems = [
    { href: `${baseUrl}/dashboard`, label: navLabels.dashboard, icon: LayoutDashboard },
    { href: `${baseUrl}/slots`, label: navLabels.bookings, icon: Calendar },
    { href: `${baseUrl}/courts`, label: navLabels.courts, icon: MapPin },
    { href: `${baseUrl}/players`, label: navLabels.players, icon: Users },
    { href: `${baseUrl}/incidents`, label: navLabels.incidents, icon: AlertTriangle },
    { href: `${baseUrl}/settings`, label: navLabels.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[var(--surface)] border-r border-[var(--border)]">
        {/* Logo / Club Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--gold)] flex items-center justify-center">
              <Building2 className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] font-medium">
                Club Manager
              </p>
              <p className="text-sm font-bold text-white truncate">{clubName}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const isIncidents = item.href.includes("incidents");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                  active
                    ? "bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20"
                    : "text-[var(--foreground-muted)] hover:text-white hover:bg-[var(--surface-elevated)]",
                  isIncidents && !active && "text-[var(--warning)]"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {isIncidents && (
                  <span className="ml-auto text-[10px] font-bold bg-[var(--warning)]/20 text-[var(--warning)] px-2 py-0.5 rounded-full">
                    3
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--foreground-muted)] hover:text-white hover:bg-[var(--surface-elevated)] transition-all text-sm font-medium"
          >
            <LogOut className="h-5 w-5" />
            Retour à l&apos;app
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--surface)]/95 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[var(--gold)] flex items-center justify-center">
              <Building2 className="h-4 w-4 text-black" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] font-medium">
                Club
              </p>
              <p className="text-sm font-bold text-white">{clubName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:overflow-y-auto">
        <div className="mx-auto max-w-6xl p-4 pt-20 pb-24 sm:p-6 sm:pt-20 sm:pb-24 lg:p-6 lg:pt-6 lg:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-around px-2 pb-[max(env(safe-area-inset-bottom),0px)]">
          {navItems.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[56px]",
                  active ? "text-[var(--gold)]" : "text-[var(--foreground-muted)]"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-bold uppercase tracking-tight">
                  {item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
