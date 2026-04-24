import Link from "next/link";

import { signOutAction } from "@/modules/auth/actions/sign-out";
import { getAuthenticatedUser } from "@/modules/auth/service";

type AuthStateBadgeProps = Readonly<{
  locale: string;
  labels: {
    guest: string;
    signIn: string;
    signedInAs: string;
    signOut: string;
  };
}>;

export async function AuthStateBadge({ locale, labels }: AuthStateBadgeProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <div className="text-right">
        <p className="text-[11px] text-slate-500">{labels.guest}</p>
        <Link
          href={`/${locale}/auth/sign-in`}
          className="text-xs font-semibold text-sky-700"
        >
          {labels.signIn}
        </Link>
      </div>
    );
  }

  const displayName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name) ||
    user.email ||
    "player";

  return (
    <div className="text-right">
      <p className="text-[11px] text-slate-500">
        {labels.signedInAs} {displayName}
      </p>
      <form action={signOutAction} className="mt-1">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
          {labels.signOut}
        </button>
      </form>
    </div>
  );
}
