import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { CourtLabelEditor } from "./_components/court-label-editor";
import { MapPin, Plus, Trash2, Sun, CloudSun } from "lucide-react";

type ClubCourtsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubCourtsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return { title: "Courts" };
  }
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.club;
  return {
    title: labels.courtsManageMetaTitle,
    description: labels.courtsManageMetaDescription,
  };
}

export default async function ClubCourtsPage({ params }: ClubCourtsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.club;

  const user = await requireUser({ locale, redirectPath: "club/courts" });
  const managedClub = await clubService.getManagedClub(user.id);

  if (!managedClub) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-bold text-white">{labels.noClubAccessTitle}</h1>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">{labels.noClubAccessSubtitle}</p>
        <Link
          href={`/${locale}/clubs/new`}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--gold)] px-5 text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)]"
        >
          {labels.noClubCreateCta}
        </Link>
      </div>
    );
  }

  const courts = await clubService.getCourtsByClubId(managedClub.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{labels.courtsTitle}</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">{labels.courtsSubtitle}</p>
          <p className="mt-2 max-w-xl text-xs text-[var(--foreground-muted)]">{labels.courtsLabelExplainer}</p>
        </div>
        <button
          type="button"
          disabled
          title={labels.courtsAddComingSoonTitle}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--gold)]/40 px-4 text-sm font-bold text-black opacity-60"
        >
          <Plus className="h-4 w-4" />
          {labels.courtsAddComingSoon}
        </button>
      </div>

      <div className="grid gap-4">
        {courts.map((court) => (
          <div
            key={court.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10">
                  <MapPin className="h-6 w-6 text-[var(--gold)]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--gold)]/10 px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--gold)]">
                      {court.surface}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-[var(--foreground-muted)]">
                      {court.isIndoor ? (
                        <span className="flex items-center gap-1">
                          <CloudSun className="h-3 w-3 shrink-0" aria-hidden />
                          {labels.courtsCourtIndoor}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Sun className="h-3 w-3 shrink-0" aria-hidden />
                          {labels.courtsCourtOutdoor}
                        </span>
                      )}
                    </div>
                  </div>
                  <CourtLabelEditor
                    locale={locale as Locale}
                    clubId={managedClub.id}
                    courtId={court.id}
                    initialLabel={court.label}
                    labelFieldAria={labels.courtLabelEditorFieldAria}
                    saveCta={labels.courtLabelEditorSave}
                    savingCta={labels.courtLabelEditorSaving}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled
                title={labels.courtsDeleteComingSoonTitle}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)] opacity-50"
                aria-disabled
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {courts.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--foreground-muted)]">
          {labels.courtsListEmpty}
        </p>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="mb-2 font-bold text-white">{labels.courtsPricingComingSoonTitle}</h3>
        <p className="text-sm text-[var(--foreground-muted)]">{labels.courtsPricingComingSoonBody}</p>
      </div>
    </div>
  );
}
