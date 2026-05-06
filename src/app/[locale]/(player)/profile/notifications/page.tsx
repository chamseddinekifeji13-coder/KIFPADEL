import Link from "next/link";
import { Bell, ChevronLeft, Mail, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";

type ProfileNotificationsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileNotificationsPage({
  params,
}: ProfileNotificationsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await requireUser({ locale, redirectPath: "profile/notifications" });
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;

  const preferences = [
    {
      icon: Bell,
      title: labels.notificationBookingTitle,
      description: labels.notificationBookingDescription,
      enabled: true,
    },
    {
      icon: ShieldCheck,
      title: labels.notificationTrustTitle,
      description: labels.notificationTrustDescription,
      enabled: true,
    },
    {
      icon: Mail,
      title: labels.notificationMarketingTitle,
      description: labels.notificationMarketingDescription,
      enabled: false,
    },
  ];

  return (
    <div className="flex-1 space-y-5 p-4 pb-24">
      <Link
        href={`/${locale}/profile`}
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--foreground-muted)] hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {labels.accountBackToProfile}
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--gold)]">
          {labels.accountSettingsTitle}
        </p>
        <h1 className="text-2xl font-black text-white">{labels.notificationsPageTitle}</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {labels.notificationsPageSubtitle}
        </p>
      </header>

      <div className="space-y-3">
        {preferences.map(({ icon: Icon, title, description, enabled }) => (
          <Card key={title} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-white">{title}</h2>
                  <p className="text-xs leading-5 text-[var(--foreground-muted)]">
                    {description}
                  </p>
                </div>
              </div>
              <span
                className={[
                  "mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors",
                  enabled ? "bg-[var(--gold)]" : "bg-slate-700",
                ].join(" ")}
                aria-label={enabled ? labels.notificationEnabled : labels.notificationDisabled}
              >
                <span
                  className={[
                    "h-4 w-4 rounded-full bg-black transition-transform",
                    enabled ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 text-sm text-[var(--foreground-muted)]">
        {labels.notificationsComingSoon}
      </Card>
    </div>
  );
}
