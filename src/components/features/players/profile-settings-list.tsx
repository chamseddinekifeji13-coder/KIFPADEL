import { User, Bell, HelpCircle, ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";

interface ProfileSettingsListProps {
  locale: string;
}

export function ProfileSettingsList({ locale }: ProfileSettingsListProps) {
  const settingsItems = [
    {
      label: "Informations personnelles",
      icon: User,
      href: `/${locale}/profile/edit`,
    },
    {
      label: "Notifications",
      icon: Bell,
      href: `/${locale}/profile/notifications`,
    },
    {
      label: "Aide & Support",
      icon: HelpCircle,
      href: `/${locale}/support`,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-[var(--foreground-muted)] font-medium px-1">
        Paramètres
      </h3>
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
        {settingsItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between p-4 hover:bg-[var(--surface-elevated)] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 text-[var(--foreground-muted)] group-hover:text-[var(--gold)] transition-colors" />
              <span className="text-sm font-medium text-white">{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
          </Link>
        ))}
        
        {/* Sign Out */}
        <form action={`/${locale}/auth/sign-out`} method="POST">
          <button
            type="submit"
            className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Déconnexion</span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
