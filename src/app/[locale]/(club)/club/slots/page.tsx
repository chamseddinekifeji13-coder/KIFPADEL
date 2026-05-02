import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { SlotsManager } from "./slots-manager";

type ClubSlotsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubSlotsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Manage Bookings" : "Gérer les réservations",
  };
}

export default async function ClubSlotsPage({ params }: ClubSlotsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  // Mock data - would come from database
  const bookings = [
    {
      id: "1",
      time: "09:00",
      endTime: "10:30",
      court: "Court 1",
      player: { id: "p1", name: "Ahmed B.", trustScore: 85, phone: "+216 55 123 456" },
      status: "confirmed" as const,
      paymentMethod: "online" as const,
      amount: 40,
    },
    {
      id: "2",
      time: "10:30",
      endTime: "12:00",
      court: "Court 2",
      player: { id: "p2", name: "Sarah M.", trustScore: 72, phone: "+216 55 789 012" },
      status: "confirmed" as const,
      paymentMethod: "on_site" as const,
      amount: 40,
    },
    {
      id: "3",
      time: "11:00",
      endTime: "12:30",
      court: "Court 1",
      player: { id: "p3", name: "Mehdi K.", trustScore: 45, phone: "+216 55 345 678" },
      status: "pending" as const,
      paymentMethod: "on_site" as const,
      amount: 40,
    },
    {
      id: "4",
      time: "14:00",
      endTime: "15:30",
      court: "Court 3",
      player: { id: "p4", name: "Youssef T.", trustScore: 92, phone: "+216 55 901 234" },
      status: "confirmed" as const,
      paymentMethod: "online" as const,
      amount: 50,
    },
    {
      id: "5",
      time: "16:00",
      endTime: "17:30",
      court: "Court 1",
      player: { id: "p5", name: "Ines L.", trustScore: 38, phone: "+216 55 567 890" },
      status: "pending" as const,
      paymentMethod: "on_site" as const,
      amount: 40,
    },
  ];

  const courts = ["Court 1", "Court 2", "Court 3"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{dictionary.club.slotsTitle}</h1>
          <p className="text-[var(--foreground-muted)] text-sm mt-1">
            Gérez les créneaux et confirmez les présences
          </p>
        </div>
      </div>

      <SlotsManager bookings={bookings} courts={courts} locale={locale} />
    </div>
  );
}
