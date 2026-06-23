"use client";

import { useEffect, useState } from "react";
import { buildBookingInviteUrl } from "@/lib/bookings/invite-url";
import { loadStoredBookingInvites, storeBookingInvites } from "@/lib/bookings/invite-session";
import {
  getActiveBookingInviteId,
  shareBookingInviteLink,
} from "@/lib/bookings/share-invite";
import {
  isBookingInviteShared,
  markBookingInviteShared,
  readSharedInviteIds,
} from "@/lib/bookings/invite-shared-storage";
import {
  createBookingSplitInvitesAction,
  refreshBookingSplitInvitesAction,
} from "@/modules/bookings/actions/split-payment";
import type { BookingSplitInvite } from "@/modules/bookings/split-payment-repository";
import { cn } from "@/lib/utils/cn";

type Props = {
  locale: string;
  bookingId: string;
  clubName: string;
  sharePrice: number;
  playerDisplayName: string;
  inviteId?: string;
  validInviteIds?: string[];
  label?: string;
  invitedLabel?: string;
  className?: string;
  disabled?: boolean;
};

async function resolveInviteUrl(
  locale: string,
  bookingId: string,
  origin: string,
  preferredInviteId?: string,
): Promise<{ inviteId: string; url: string; sharePrice: number } | null> {
  const targetInviteId = preferredInviteId || getActiveBookingInviteId(bookingId);
  const shared = readSharedInviteIds(bookingId);
  const stored = loadStoredBookingInvites(bookingId);

  if (targetInviteId) {
    const hit = stored.find((s) => s.inviteId === targetInviteId && s.token);
    if (hit) {
      return {
        inviteId: hit.inviteId,
        url: buildBookingInviteUrl(origin, locale, hit.inviteId, hit.token),
        sharePrice: 0,
      };
    }
  }

  const nextStored = stored.find((s) => s.token && !shared.has(s.inviteId));
  if (nextStored) {
    return {
      inviteId: nextStored.inviteId,
      url: buildBookingInviteUrl(origin, locale, nextStored.inviteId, nextStored.token),
      sharePrice: 0,
    };
  }

  const refreshed = await refreshBookingSplitInvitesAction({ locale, bookingId });
  let invites: BookingSplitInvite[] = [];
  if (refreshed.ok && refreshed.invites.length > 0) {
    invites = refreshed.invites;
  } else {
    const created = await createBookingSplitInvitesAction({ locale, bookingId });
    if (!created.ok) return null;
    invites = created.invites;
  }

  storeBookingInvites(bookingId, invites, origin, locale);
  const pick = invites.find((inv) => inv.inviteToken && !shared.has(inv.inviteId)) ?? invites[0];
  if (!pick?.inviteToken) return null;

  return {
    inviteId: pick.inviteId,
    url: buildBookingInviteUrl(origin, locale, pick.inviteId, pick.inviteToken),
    sharePrice: pick.sharePrice,
  };
}

export function BookingCourtInviteButton({
  locale,
  bookingId,
  clubName,
  sharePrice,
  playerDisplayName,
  inviteId,
  validInviteIds,
  label,
  invitedLabel,
  className,
  disabled = false,
}: Props) {
  const isEn = locale === "en";
  const resolvedInviteId = inviteId ?? getActiveBookingInviteId(bookingId) ?? "";
  const defaultLabel = isEn ? "Send" : "Envoyer";
  const [pending, setPending] = useState(false);
  const [alreadyInvited, setAlreadyInvited] = useState(() =>
    resolvedInviteId
      ? isBookingInviteShared(bookingId, resolvedInviteId, validInviteIds)
      : false,
  );

  useEffect(() => {
    const sync = () => {
      if (!resolvedInviteId) return;
      setAlreadyInvited(isBookingInviteShared(bookingId, resolvedInviteId, validInviteIds));
    };
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
  }, [bookingId, resolvedInviteId, validInviteIds]);

  const inactive = disabled || alreadyInvited || pending;

  const onInvite = async () => {
    if (inactive || !resolvedInviteId) return;
    if (isBookingInviteShared(bookingId, resolvedInviteId, validInviteIds)) {
      setAlreadyInvited(true);
      return;
    }

    setPending(true);

    const resolved = await resolveInviteUrl(
      locale,
      bookingId,
      window.location.origin,
      resolvedInviteId,
    );
    if (!resolved) {
      setPending(false);
      return;
    }

    if (isBookingInviteShared(bookingId, resolved.inviteId, validInviteIds)) {
      setAlreadyInvited(true);
      setPending(false);
      return;
    }

    const price = resolved.sharePrice > 0 ? resolved.sharePrice : sharePrice;
    const ok = await shareBookingInviteLink(resolved.url, price, clubName, playerDisplayName);
    if (ok) {
      markBookingInviteShared(bookingId, resolvedInviteId);
      setAlreadyInvited(true);
    }

    setPending(false);
  };

  const displayLabel = alreadyInvited
    ? invitedLabel ?? (isEn ? "Invited" : "Invité")
    : pending
      ? "…"
      : label ?? defaultLabel;

  return (
    <button
      type="button"
      disabled={inactive}
      onClick={() => void onInvite()}
      className={cn(
        className ??
          "relative z-10 inline-flex min-h-[44px] shrink-0 items-center justify-center text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all touch-manipulation select-none",
        alreadyInvited
          ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 cursor-not-allowed"
          : "text-black bg-gold hover:bg-gold-light active:scale-95 shadow-gold",
        pending && "opacity-50",
        disabled && !alreadyInvited && "opacity-40 cursor-not-allowed",
      )}
    >
      {displayLabel}
    </button>
  );
}
