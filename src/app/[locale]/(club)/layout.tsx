import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClubShell } from "@/components/layout/club-shell";

type ClubLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function ClubLayout({ children, params }: ClubLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // For now, allow access without strict role check (will be enforced later)
  // In production, you would check if user has club_manager or club_staff role

  return (
    <ClubShell
      locale={locale}
      clubName="Mon Club"
      navLabels={{
        dashboard: dictionary.club.dashboardTitle,
        bookings: "Réservations",
        courts: dictionary.club.courtsTitle,
        players: "Joueurs",
        incidents: dictionary.club.incidentsTitle,
        settings: "Paramètres",
      }}
    >
      {children}
    </ClubShell>
  );
}
