import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { ClubSettingsForm } from "./settings-form";

type ClubSettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubSettingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Club Settings" : "Paramètres du club",
  };
}

export default async function ClubSettingsPage({ params }: ClubSettingsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.club;

  const user = await requireUser({ locale, redirectPath: "club/settings" });
  const managed = await clubService.getManagedClub(user.id);

  if (!managed) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-bold text-white">{labels.noClubAccessTitle}</h1>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">{labels.noClubAccessSubtitle}</p>
        <Link
          href={`/${locale}/club/dashboard`}
          className="mt-4 inline-block text-sm font-medium text-[var(--gold)]"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const currentSettings = {
    clubId: managed.id,
    clubName: managed.name,
    city: managed.city,
    address: managed.address ?? "",
    indoorCourtsCount: managed.indoor_courts_count,
    outdoorCourtsCount: managed.outdoor_courts_count,
    contactName: managed.contact_name ?? "",
    phone: managed.contact_phone ?? "",
    email: managed.contact_email ?? "",

    allowPayOnSite: true,
    minTrustForPayOnSite: 70,
    requirePhoneVerification: true,
    requireProfileComplete: true,
    freeCancellationHours: 24,
    lateCancelPenalty: true,
    noShowPenaltyPoints: 18,
    autoReportNoShow: true,
    noShowGracePeriodMinutes: 15,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres du club</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Configurez les règles de réservation et de confiance
        </p>
      </div>

      <ClubSettingsForm initialSettings={currentSettings} locale={locale} />
    </div>
  );
}
