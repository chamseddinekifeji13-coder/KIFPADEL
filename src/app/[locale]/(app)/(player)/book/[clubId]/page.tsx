import { isLocale, type Locale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { clubService } from "@/modules/clubs/service";
import { playerService } from "@/modules/players/service";
import { getClubAvailability } from "@/modules/bookings/availability-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { DEFAULT_BOOKING_DURATION_MINUTES } from "@/modules/bookings/constants";
import { MapPin, ArrowLeft, Calendar as CalendarIcon, InfoIcon, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { TimeContainer } from "@/app/[locale]/(app)/(player)/book/[clubId]/time-container";
import { ClubDirectionsButton } from "@/components/features/clubs/club-directions-button";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatClubCourtsSummary } from "@/lib/utils/club-display";
import { Mail, Phone, Building2, User } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClubDetailPageProps = {
  params: Promise<{ locale: string; clubId: string }>;
  searchParams: Promise<{ date?: string }>;
};

export async function generateMetadata({ params }: ClubDetailPageProps): Promise<Metadata> {
  const { clubId } = await params;
  const club = await clubService.getClubDetails(clubId).catch(() => null);
  
  return {
    title: club ? `${club.name} | Kifpadel` : "Club Details | Kifpadel",
    description: club ? `Réservez votre terrain de Padel à ${club.name} (${club.city}).` : "Détails du club de Padel.",
  };
}

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

  const dictionary = await getDictionary(locale as Locale);
  const clubLabels = dictionary.club;
  const courtsSummary = formatClubCourtsSummary(
    club.indoor_courts_count,
    club.outdoor_courts_count,
    locale,
  );
  const hasContact =
    Boolean(club.contact_name?.trim()) ||
    Boolean(club.contact_phone?.trim()) ||
    Boolean(club.contact_email?.trim());

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
    <div className="flex-1 pb-24">
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--foreground-muted)] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[var(--gold)]" />
              <span>{club.city}, Tunisie</span>
            </span>
            <ClubDirectionsButton
              club={{
                name: club.name,
                city: club.city,
                address: club.address ?? undefined,
              }}
              label="Itinéraire"
              className="border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-white hover:bg-[var(--gold)]/15"
            />
          </div>
          {club.address ? (
            <p className="text-xs text-white/70 leading-relaxed pl-0.5">{club.address}</p>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {(courtsSummary || hasContact) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {courtsSummary ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--foreground-muted)]">
                  <Building2 className="h-4 w-4 text-[var(--gold)]" />
                  {clubLabels.bookPlayerCourtsTitle}
                </div>
                <p className="text-sm text-white font-medium">{courtsSummary}</p>
              </div>
            ) : null}
            {hasContact ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--foreground-muted)]">
                  <User className="h-4 w-4 text-[var(--gold)]" />
                  {clubLabels.bookPlayerContactTitle}
                </div>
                <ul className="space-y-2 text-sm">
                  {club.contact_name ? (
                    <li className="text-white font-medium">{club.contact_name}</li>
                  ) : null}
                  {club.contact_phone ? (
                    <li>
                      <a
                        href={`tel:${club.contact_phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-2 text-[var(--gold)] hover:underline"
                      >
                        <Phone className="h-4 w-4 shrink-0" />
                        {club.contact_phone}
                      </a>
                    </li>
                  ) : null}
                  {club.contact_email ? (
                    <li>
                      <a
                        href={`mailto:${club.contact_email}`}
                        className="inline-flex items-center gap-2 text-[var(--gold)] hover:underline break-all"
                      >
                        <Mail className="h-4 w-4 shrink-0" />
                        {club.contact_email}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </section>
        )}

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
            <p>Toutes les réservations sont pour une durée de <span className="text-white font-bold">{DEFAULT_BOOKING_DURATION_MINUTES} minutes</span>.</p>
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
