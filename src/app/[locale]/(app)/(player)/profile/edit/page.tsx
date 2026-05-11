import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { updateProfileAction } from "@/modules/players/actions/update-profile";
import { playerService } from "@/modules/players/service";

type ProfileEditPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function ProfileEditPage({ params, searchParams }: ProfileEditPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { error, status } = await searchParams;
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

      {status === "updated" ? (
        <Card className="border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {labels.personalInfoUpdateSuccess}
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error === "missing_fields"
            ? labels.personalInfoMissingFieldsError
            : error === "invalid_email"
              ? labels.personalInfoInvalidEmailError
              : error === "email_update_failed"
                ? labels.personalInfoEmailUpdateFailedError
                : labels.personalInfoUpdateFailedError}
        </Card>
      ) : null}

      <form action={updateProfileAction}>
        <input type="hidden" name="locale" value={locale} />
        <Card className="space-y-4 p-5">
          <div className="space-y-1">
            <label htmlFor="displayName" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
              <User className="h-4 w-4" />
              {labels.personalInfoDisplayNameLabel}
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              defaultValue={profile.display_name}
              className="h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm text-white outline-none transition-all focus:border-gold/50 focus:ring-1 focus:ring-gold/50"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
              <Mail className="h-4 w-4" />
              {labels.personalInfoEmailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email ?? ""}
              placeholder={labels.personalInfoMissingEmail}
              className="h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm text-white outline-none transition-all focus:border-gold/50 focus:ring-1 focus:ring-gold/50"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="gender"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]"
            >
              Genre (matchmaking)
            </label>
            <select
              id="gender"
              name="gender"
              defaultValue={profile.gender ?? ""}
              className="h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm text-white outline-none transition-all focus:border-gold/50 focus:ring-1 focus:ring-gold/50"
            >
              <option value="">Non renseigné</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </div>

          <Button type="submit" className="w-full">
            {labels.personalInfoSaveCta}
          </Button>
        </Card>
      </form>

      <Card className="p-4 text-sm text-[var(--foreground-muted)]">
        {labels.personalInfoEditableHint}
      </Card>
    </section>
  );
}
