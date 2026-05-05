import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClubShell } from "@/components/layout/club-shell";
import { clubService } from "@/modules/clubs/service";

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
  const managedClub = user ? await clubService.getManagedClub(user.id) : null;

  // For now, allow access without strict role check (will be enforced later)
  // In production, you would check if user has club_manager or club_staff role

  return (
    <ClubShell
      locale={locale}
      clubName={managedClub?.name ?? dictionary.club.defaultClubName}
      navLabels={{
        dashboard: dictionary.club.dashboardTitle,
        bookings: dictionary.club.navBookings,
        courts: dictionary.club.courtsTitle,
        players: dictionary.club.navPlayers,
        incidents: dictionary.club.incidentsTitle,
        settings: dictionary.club.navSettings,
      }}
      uiLabels={{
        managerLabel: dictionary.club.managerLabel,
        mobileClubLabel: dictionary.club.mobileClubLabel,
        backToApp: dictionary.club.navBackToApp,
      }}
    >
      {children}
    </ClubShell>
  );
}
