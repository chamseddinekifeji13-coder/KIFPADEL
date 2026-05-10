import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { IncidentsManager } from "./incidents-manager";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";

type ClubIncidentsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubIncidentsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Manage Incidents" : "Gérer les incidents",
  };
}

export default async function ClubIncidentsPage({ params }: ClubIncidentsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const user = await requireUser({ locale, redirectPath: "club/incidents" });
  const managedClub = await clubService.getManagedClub(user.id);

  if (!managedClub) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground-muted)]">
        {dictionary.club.noClubAccessSubtitle}
      </div>
    );
  }

  // Mock data - would come from database
  const incidents = [
    {
      id: "1",
      player: { id: "p1", name: "Karim Z.", trustScore: 42, phone: "+216 55 123 456" },
      type: "no_show" as const,
      date: "2026-04-30",
      bookingTime: "14:00",
      court: "Court 1",
      status: "pending" as const,
      notes: "",
    },
    {
      id: "2",
      player: { id: "p2", name: "Omar F.", trustScore: 58, phone: "+216 55 789 012" },
      type: "late_cancel" as const,
      date: "2026-04-29",
      bookingTime: "16:00",
      court: "Court 2",
      status: "pending" as const,
      notes: "Annulé 30min avant",
    },
    {
      id: "3",
      player: { id: "p3", name: "Sami B.", trustScore: 25, phone: "+216 55 345 678" },
      type: "bad_behavior" as const,
      date: "2026-04-28",
      bookingTime: "10:00",
      court: "Court 1",
      status: "resolved" as const,
      notes: "Comportement agressif envers staff",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{dictionary.club.incidentsTitle}</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Prototype interne : les données affichées sont encore à raccorder aux vrais incidents.
        </p>
      </div>

      <IncidentsManager incidents={incidents} locale={locale} />
    </div>
  );
}
