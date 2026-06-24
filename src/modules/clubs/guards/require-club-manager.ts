import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/modules/auth/service";
import { fetchManagedClubForUser, type ManagedClubBranding } from "@/modules/clubs/repository";

type RequireClubManagerOptions = {
  /** Chemin post-connexion si l'utilisateur n'est pas authentifié. */
  redirectPath?: string;
};

/**
 * Bloque l'espace /club/* aux gestionnaires authentifiés (rôle staff sur club_memberships).
 */
export async function requireClubManager(
  locale: string,
  options: RequireClubManagerOptions = {},
): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>; managedClub: ManagedClubBranding }> {
  const redirectPath = options.redirectPath ?? "club/dashboard";
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/${redirectPath}`);
  }

  const managedClub = await fetchManagedClubForUser(user.id);
  if (!managedClub) {
    redirect(`/${locale}/dashboard?error=club_access_denied`);
  }

  if (!managedClub.is_active) {
    redirect(`/${locale}/dashboard?error=club_inactive`);
  }

  return { user, managedClub };
}
