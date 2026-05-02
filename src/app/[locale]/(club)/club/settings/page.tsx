import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
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

  // Mock current settings - would come from database
  const currentSettings = {
    clubName: "Padel Club Tunis",
    address: "Route de la Marsa, Tunis",
    phone: "+216 71 123 456",
    email: "contact@padelclubtunis.tn",
    
    // Booking Policy
    allowPayOnSite: true,
    minTrustForPayOnSite: 70,
    requirePhoneVerification: true,
    requireProfileComplete: true,
    
    // Cancellation Policy
    freeCancellationHours: 24,
    lateCancelPenalty: true,
    
    // No-show Policy
    noShowPenaltyPoints: 18,
    autoReportNoShow: true,
    noShowGracePeriodMinutes: 15,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
