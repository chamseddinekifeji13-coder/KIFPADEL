import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Mail, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { playerService } from "@/modules/players/service";

type ProfileEditPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileEditPage({ params }: ProfileEditPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await requireUser({ locale, redirectPath: "profile/edit" });
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  const profile = await playerService.getPlayerProfile(user.id);

  if (!profile) redirect(`/${locale}/onboarding`);

  return (
    <section className="space-y-4 pb-24">
      <Link
        href={`/${locale}/profile`}
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--foreground-muted)] hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {labels.accountBackToProfile}
      </Link>

      <Card className="p-5">
        <SectionTitle
          title={labels.personalInfoTitle}
          subtitle={labels.personalInfoSubtitle}
          className="bg-transparent p-0"
        />
      </Card>

      <Card className="space-y-4 p-5">
        <div className="space-y-1">
          <label htmlFor="displayName" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
            <User className="h-4 w-4" />
            {labels.personalInfoDisplayNameLabel}
          </label>
          <input
            id="displayName"
            value={profile.display_name}
            readOnly
            className="h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm text-white outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
            <Mail className="h-4 w-4" />
            {labels.personalInfoEmailLabel}
          </label>
          <input
            id="email"
            value={user.email ?? labels.personalInfoMissingEmail}
            readOnly
            className="h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm text-white outline-none"
          />
        </div>
      </Card>

      <Card className="p-4 text-sm text-[var(--foreground-muted)]">
        {labels.personalInfoReadonlyHint}
      </Card>
    </section>
  );
}
