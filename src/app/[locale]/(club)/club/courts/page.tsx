import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Sun,
  CloudSun,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type ClubCourtsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubCourtsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Manage Courts" : "Gérer les terrains",
  };
}

export default async function ClubCourtsPage({ params }: ClubCourtsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  // Mock data
  const courts = [
    { id: "1", label: "Court 1", surface: "panoramic", isIndoor: false, isActive: true, pricePerHour: 40 },
    { id: "2", label: "Court 2", surface: "standard", isIndoor: false, isActive: true, pricePerHour: 35 },
    { id: "3", label: "Court 3", surface: "panoramic", isIndoor: true, isActive: true, pricePerHour: 50 },
    { id: "4", label: "Court 4", surface: "standard", isIndoor: true, isActive: false, pricePerHour: 45 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{dictionary.club.courtsTitle}</h1>
          <p className="text-[var(--foreground-muted)] text-sm mt-1">
            Gérez vos terrains et tarifs
          </p>
        </div>
        <button className="h-10 px-4 rounded-xl bg-[var(--gold)] text-black font-bold text-sm hover:bg-[var(--gold-dark)] transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Courts Grid */}
      <div className="grid gap-4">
        {courts.map((court) => (
          <div
            key={court.id}
            className={`bg-[var(--surface)] border rounded-2xl p-5 ${
              court.isActive ? "border-[var(--border)]" : "border-[var(--danger)]/30 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-[var(--gold)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{court.label}</h3>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
                      {court.surface}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-[var(--foreground-muted)]">
                    {court.isIndoor ? (
                      <span className="flex items-center gap-1">
                        <CloudSun className="h-3 w-3" />
                        Indoor
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Sun className="h-3 w-3" />
                        Outdoor
                      </span>
                    )}
                    <span>·</span>
                    <span className="text-[var(--gold)] font-bold">{court.pricePerHour} DT/h</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="h-9 w-9 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-white transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="h-9 w-9 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button className="h-9 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center gap-2 text-sm font-medium transition-colors">
                  {court.isActive ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-[var(--success)]" />
                      <span className="text-[var(--success)]">Actif</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-[var(--danger)]" />
                      <span className="text-[var(--danger)]">Inactif</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Info */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4">Tarification dynamique</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-[var(--background)]">
            <p className="text-[var(--foreground-muted)]">Heures creuses (9h-12h)</p>
            <p className="text-white font-bold">-20% sur le tarif de base</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--background)]">
            <p className="text-[var(--foreground-muted)]">Heures pleines (18h-21h)</p>
            <p className="text-[var(--gold)] font-bold">+10% sur le tarif de base</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--background)]">
            <p className="text-[var(--foreground-muted)]">Weekend</p>
            <p className="text-[var(--gold)] font-bold">+15% sur le tarif de base</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--background)]">
            <p className="text-[var(--foreground-muted)]">Membres fidèles</p>
            <p className="text-[var(--success)] font-bold">-10% automatique</p>
          </div>
        </div>
      </div>
    </div>
  );
}
