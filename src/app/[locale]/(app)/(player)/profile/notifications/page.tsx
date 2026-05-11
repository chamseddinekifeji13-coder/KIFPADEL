import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { NotificationPreferences } from "./notification-preferences";

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

      <NotificationPreferences labels={labels} />

      <Card className="p-4 text-sm text-[var(--foreground-muted)]">
        {labels.notificationsComingSoon}
      </Card>
    </div>
  );
}
