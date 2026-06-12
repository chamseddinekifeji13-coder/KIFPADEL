"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

type InviteMatchBannerProps = {
  locale: string;
};

/**
 * Bandeau si l'utilisateur arrive depuis « Inviter » (query inviteName / invitePlayer).
 */
export function InviteMatchBanner({ locale }: InviteMatchBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteName = searchParams.get("inviteName")?.trim();
  const invitePlayer = searchParams.get("invitePlayer")?.trim();

  if (!inviteName && !invitePlayer) {
    return null;
  }

  const display = inviteName || (locale === "en" ? "This player" : "Ce joueur");
  const isEn = locale === "en";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-bold text-amber-900">{isEn ? "Invite" : "Invitation"}</p>
        <p className="text-amber-900/90 leading-relaxed">
          {isEn ? (
            <>
              You&apos;re inviting <span className="font-semibold">{display}</span> to play. Create your match below —
              after publishing, the share sheet will open automatically (WhatsApp, SMS, etc.).
            </>
          ) : (
            <>
              Tu invites <span className="font-semibold">{display}</span> à jouer. Crée ton match ci-dessous : après
              publication, le partage du lien s&apos;ouvrira automatiquement (WhatsApp, SMS, etc.).
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.replace(`/${locale}/matches/create`)}
        className="shrink-0 rounded-lg p-1.5 text-amber-800 hover:bg-amber-100 transition-colors"
        aria-label={isEn ? "Dismiss" : "Masquer"}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
