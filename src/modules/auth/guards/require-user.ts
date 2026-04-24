import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/modules/auth/service";

type RequireUserOptions = {
  locale: string;
  redirectPath?: string;
};

export async function requireUser({ locale, redirectPath = "dashboard" }: RequireUserOptions) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/${redirectPath}`);
  }

  return user;
}
