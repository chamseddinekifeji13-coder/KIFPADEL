"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  countSharedInvites,
  isBookingInviteShared,
} from "@/lib/bookings/invite-shared-storage";
import { bookingInvitesPath } from "@/lib/booking-paths";

type Props = {
  locale: string;
  bookingId: string;
  clubName: string;
  sharePrice: number;
  inviteId?: string;
  totalPendingInvites: number;
  pendingInviteIds: string[];
};

export function FindPlayersBookingInviteBanner({
  locale,
  bookingId,
  clubName,
  sharePrice,
  inviteId,
  totalPendingInvites,
  pendingInviteIds,
}: Props) {
  const isEn = locale === "en";
  const [sharedCount, setSharedCount] = useState(0);
  const [currentShared, setCurrentShared] = useState(false);

  const sync = () => {
    setSharedCount(countSharedInvites(bookingId, pendingInviteIds));
    setCurrentShared(
      inviteId ? isBookingInviteShared(bookingId, inviteId, pendingInviteIds) : false,
    );
  };

  useEffect(() => {
    sync();
    const onShared = (event: Event) => {
      const detail = (event as CustomEvent<{ bookingId: string }>).detail;
      if (detail?.bookingId === bookingId) sync();
    };
    window.addEventListener("kifpadel:booking-invite-shared", onShared);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("kifpadel:booking-invite-shared", onShared);
      window.removeEventListener("focus", sync);
    };
  }, [bookingId, inviteId, pendingInviteIds]);

  const quotaReached =
    totalPendingInvites > 0 &&
    countSharedInvites(bookingId, pendingInviteIds) >= totalPendingInvites;

  const backHref = bookingInvitesPath(locale, bookingId);

  if (quotaReached) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          <div className="space-y-2">
            <p className="font-bold text-emerald-100">
              {isEn ? "All partners invited" : "Nombre de partenaires atteint"}
            </p>
            <p className="text-emerald-200/90 leading-relaxed text-xs">
              {isEn
                ? `Everyone needed for this court at ${clubName} has been invited (${sharePrice} DT / seat).`
                : `Tous les partenaires prévus pour ce créneau chez ${clubName} ont été invités (${sharePrice} DT / place).`}
            </p>
            <Link href={backHref} className="inline-block text-xs font-bold text-[var(--gold)] underline">
              {isEn ? "Back to my invites →" : "Retour à mes invitations →"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (currentShared && inviteId) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          <div className="space-y-2">
            <p className="font-bold text-emerald-100">
              {isEn ? "Invitation sent for this seat" : "Invitation envoyée pour cette place"}
            </p>
            <p className="text-emerald-200/90 leading-relaxed text-xs">
              {isEn
                ? `This seat is done (${sharedCount}/${totalPendingInvites}). Return to invite the next partner.`
                : `Cette place est traitée (${sharedCount}/${totalPendingInvites}). Revenez à vos invitations pour la place suivante.`}
            </p>
            <Link href={backHref} className="inline-block text-xs font-bold text-[var(--gold)] underline">
              {isEn ? "Next seat →" : "Place suivante →"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-3 text-sm">
      <p className="font-bold text-white">
        {isEn ? "Court booking invite" : "Invitation créneau"}
        {totalPendingInvites > 1 ? (
          <span className="ml-2 text-[11px] font-bold text-[var(--gold)]">
            · {sharedCount}/{totalPendingInvites} {isEn ? "invited" : "invités"}
          </span>
        ) : null}
      </p>
      <p className="text-[var(--foreground-muted)] leading-relaxed mt-1 text-xs">
        {isEn ? (
          <>
            Link copied. Tap <strong className="text-white/90">Send</strong> next to a player — WhatsApp / SMS
            opens for <strong className="text-white/90">{clubName}</strong> ({sharePrice} DT / seat).
          </>
        ) : (
          <>
            Lien copié. Appuyez sur <strong className="text-white/90">Envoyer</strong> à côté d&apos;un joueur :
            WhatsApp / SMS s&apos;ouvre pour <strong className="text-white/90">{clubName}</strong> ({sharePrice} DT /
            place).
          </>
        )}
      </p>
    </div>
  );
}
