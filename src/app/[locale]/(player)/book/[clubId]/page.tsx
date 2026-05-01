import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { clubService } from "@/modules/clubs/service";
import { playerService } from "@/modules/players/service";
import { getClubAvailability } from "@/modules/bookings/availability-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { MapPin, ArrowLeft, Calendar as CalendarIcon, InfoIcon, Clock } from "lucide-react";
import Link from "next/link";
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

  // Get current user
  let userId: string | null = null;
  let playerProfile: Awaited<ReturnType<typeof playerService.getPlayerProfile>> | null = null;
  
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
    
    if (userId) {
      playerProfile = await playerService.getPlayerProfile(userId);
    }
  } catch (err) {
    rethrowFrameworkError(err);
  }

  // If not logged in, redirect to auth
  if (!userId) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/book/${clubId}`);
  }

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

  // Get player trust info
  const playerTrustScore = playerProfile?.trust_score ?? 70;
  const playerReliability = playerProfile?.reliability_status ?? "healthy";

  return (
    <div className="flex-1 pb-10">
      {/* Hero Header - Dark Theme */}
      <div className="relative h-48 bg-[var(--surface)]">
        <Link 
          href={`/${locale}/book`}
          className="absolute top-4 left-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-[var(--surface-elevated)] text-white border border-[var(--border)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/10 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 space-y-2">
          <h1 className="text-2xl font-bold text-white">{club.name}</h1>
          <div className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)] font-medium">
            <MapPin className="h-4 w-4 text-[var(--gold)]" />
            <span>{club.city}, Tunisie</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {/* Date Selector */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
            <CalendarIcon className="h-4 w-4 text-[var(--gold)]" />
            <span className="text-xs uppercase tracking-wider font-bold">Choisir une date</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {days.map((day) => {
              const d = new Date(day);
              const isSelected = day === selectedDate;
              return (
                <Link
                  key={day}
                  href={`?date=${day}`}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[70px] py-3 rounded-xl border-2 transition-all",
                    isSelected
                      ? "bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)]"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold opacity-70">
                    {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </span>
                  <span className={cn(
                    "text-lg font-bold",
                    isSelected ? "text-[var(--gold)]" : "text-white"
                  )}>
                    {d.getDate()}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Time Slots */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
            <Clock className="h-4 w-4 text-[var(--gold)]" />
            <span className="text-xs uppercase tracking-wider font-bold">Créneaux disponibles</span>
          </div>
          
          <div className="bg-[var(--surface)] rounded-xl p-4 flex gap-3 text-[var(--foreground-muted)] text-sm border border-[var(--border)]">
            <InfoIcon className="h-5 w-5 shrink-0 text-[var(--gold)]" />
            <p>Toutes les réservations sont pour une durée de <span className="text-white font-bold">90 minutes</span>.</p>
          </div>
          
          <TimeContainer 
            slots={availability} 
            date={selectedDate}
            clubId={clubId}
            clubName={club.name}
            playerTrustScore={playerTrustScore}
            playerReliability={playerReliability}
          />
        </section>
      </div>
    </div>
  );
}
