import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Image from "next/image";
import { clubService } from "@/modules/clubs/service";
import { getClubAvailability } from "@/modules/bookings/availability-service";
import { MapPin, ArrowLeft, Calendar as CalendarIcon, InfoIcon, Clock } from "lucide-react";
import Link from "next/link";
import { SectionTitle } from "@/components/ui/section-title";
import { cn } from "@/lib/utils/cn";
import { TimeContainer } from "@/app/[locale]/(player)/book/[clubId]/time-container";


type ClubDetailPageProps = {
  params: Promise<{ locale: string; clubId: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function ClubDetailPage({
  params,
  searchParams,
}: ClubDetailPageProps) {
  const { locale, clubId } = await params;
  if (!isLocale(locale)) notFound();

  const { date: dateQuery } = await searchParams;
  const selectedDate = dateQuery || new Date().toISOString().split("T")[0];

  // Fetch club data and availability
  const club = await clubService.getClubDetails(clubId).catch(() => null);
  if (!club) notFound();

  const availability = await getClubAvailability(clubId, selectedDate);

  // Generate next 7 days for the date selector
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="flex-1 pb-10">
      {/* Hero Header */}
      <div className="relative h-64 bg-slate-200">
        <Link 
          href={`/${locale}/book`}
          className="absolute top-4 left-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-900 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {club.logo_url && (
          <Image 
            src={club.logo_url} 
            alt={club.name} 
            fill 
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 text-white space-y-1">
          <h1 className="text-3xl font-bold">{club.name}</h1>
          <div className="flex items-center gap-1.5 text-sm opacity-90 font-medium">
            <MapPin className="h-4 w-4" />
            <span>{club.city}, Tunisie</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-8 mt-4">
        {/* Date Selector */}
        <section className="space-y-4">
          <SectionTitle 
            title="Choisir une date" 
            icon={<CalendarIcon className="h-4 w-4" />}
          />
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {days.map((day) => {
              const d = new Date(day);
              const isSelected = day === selectedDate;
              return (
                <Link
                  key={day}
                  href={`?date=${day}`}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[70px] py-3 rounded-2xl border transition-all",
                    isSelected
                      ? "bg-sky-600 border-sky-600 text-white shadow-lg shadow-sky-100 scale-105"
                      : "bg-white border-slate-100 text-slate-500 hover:border-sky-200"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold opacity-70">
                    {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Time Slots */}
        <section className="space-y-4">
          <SectionTitle 
            title="Créneaux disponibles" 
            icon={<Clock className="h-4 w-4" />}
          />
          <div className="bg-sky-50 rounded-xl p-4 flex gap-3 text-sky-700 text-sm border border-sky-100">
            <InfoIcon className="h-5 w-5 shrink-0" />
            <p>Toutes les réservations sont pour une durée de <b>90 minutes</b>.</p>
          </div>
          
          <TimeContainer slots={availability} date={selectedDate} />
        </section>
      </div>
    </div>
  );
}
