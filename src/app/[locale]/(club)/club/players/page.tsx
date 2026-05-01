import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { PlayersDirectory } from "./players-directory";

type ClubPlayersPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Club Players" : "Joueurs du club",
  };
}

export default async function ClubPlayersPage({ params }: ClubPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Mock data - would come from database
  const players = [
    { id: "1", name: "Ahmed B.", trustScore: 92, league: "gold", bookingsCount: 45, lastVisit: "2026-04-30", phone: "+216 55 123 456" },
    { id: "2", name: "Sarah M.", trustScore: 85, league: "silver", bookingsCount: 32, lastVisit: "2026-04-29", phone: "+216 55 789 012" },
    { id: "3", name: "Mehdi K.", trustScore: 72, league: "silver", bookingsCount: 28, lastVisit: "2026-04-28", phone: "+216 55 345 678" },
    { id: "4", name: "Youssef T.", trustScore: 58, league: "bronze", bookingsCount: 15, lastVisit: "2026-04-25", phone: "+216 55 901 234" },
    { id: "5", name: "Ines L.", trustScore: 45, league: "bronze", bookingsCount: 8, lastVisit: "2026-04-20", phone: "+216 55 567 890" },
    { id: "6", name: "Karim Z.", trustScore: 35, league: "bronze", bookingsCount: 12, lastVisit: "2026-04-15", phone: "+216 55 234 567" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Joueurs</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Gérez les joueurs qui réservent dans votre club
        </p>
      </div>

      <PlayersDirectory players={players} locale={locale} />
    </div>
  );
}
