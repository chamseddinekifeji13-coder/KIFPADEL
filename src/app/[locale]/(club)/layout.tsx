import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ClubShell } from "@/components/layout/club-shell";
import { requireClubManager } from "@/modules/clubs/guards/require-club-manager";

type ClubLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export const dynamic = "force-dynamic";

export default async function ClubLayout({ children, params }: ClubLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);
  const { managedClub } = await requireClubManager(locale, { redirectPath: "club/dashboard" });

  return (
    <ClubShell
      locale={locale}
      clubName={managedClub.name}
      navLabels={{
        dashboard: dictionary.club.dashboardTitle,
        bookings: dictionary.club.navBookings,
        courts: dictionary.club.courtsTitle,
        players: dictionary.club.navPlayers,
        tournaments: dictionary.club.navTournaments,
        leagues: dictionary.championships.navLeagues,
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
