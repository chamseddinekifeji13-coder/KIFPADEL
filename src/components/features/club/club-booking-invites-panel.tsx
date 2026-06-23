"use client";

import { useEffect, useState } from "react";
import { Link2, Share2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buildBookingInviteUrl } from "@/lib/bookings/invite-url";
import { shareBookingInviteLink } from "@/lib/bookings/share-invite";
import {
  createClubBookingInvitesAction,
  refreshClubBookingInvitesAction,
} from "@/modules/clubs/actions/booking-invites";
import type { BookingSplitInvite } from "@/modules/bookings/split-payment-repository";

export type ClubBookingSlotSummary = {
  bookingId: string;
  court: string;
  time: string;
  endTime: string;
  sharePrice: number;
  activeSeats: number;
  pendingInvites: number;
};

type Props = {
  locale: string;
  clubName: string;
  slot: ClubBookingSlotSummary;
  existingInvites: BookingSplitInvite[];
};

type InviteWithLink = BookingSplitInvite & { url: string };

const storageKey = (bookingId: string) => `club-booking-invites:${bookingId}`;

export function ClubBookingInvitesPanel({ locale, clubName, slot, existingInvites }: Props) {
  const emptySeats = Math.max(0, 4 - slot.activeSeats - slot.pendingInvites);
  const [invites, setInvites] = useState<InviteWithLink[]>(() =>
    existingInvites
      .filter((inv) => inv.status === "pending")
      .map((inv) => ({ ...inv, url: "" })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (typeof window === "undefined" || invites.length === 0) return;
    const raw = sessionStorage.getItem(storageKey(slot.bookingId));
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as { inviteId: string; token: string; url: string }[];
      setInvites((prev) =>
        prev.map((inv) => {
          if (inv.url) return inv;
          const hit = stored.find((s) => s.inviteId === inv.inviteId);
          if (!hit?.token) return inv;
          return {
            ...inv,
            inviteToken: hit.token,
            url: hit.url || buildBookingInviteUrl(origin, locale, inv.inviteId, hit.token),
          };
        }),
      );
    } catch {
      /* ignore */
    }
  }, [slot.bookingId, locale, origin, invites.length]);

  const applyResult = (items: BookingSplitInvite[]) => {
    const withUrls = items.map((inv) => ({
      ...inv,
      url: buildBookingInviteUrl(origin, locale, inv.inviteId, inv.inviteToken),
    }));
    setInvites(withUrls);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        storageKey(slot.bookingId),
        JSON.stringify(
          withUrls.map((inv) => ({
            inviteId: inv.inviteId,
            token: inv.inviteToken,
            url: inv.url,
          })),
        ),
      );
    }
  };

  const generate = async () => {
    setError("");
    setPending(true);
    const result = await createClubBookingInvitesAction({
      locale,
      bookingId: slot.bookingId,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    applyResult(result.invites);
  };

  const refresh = async () => {
    setError("");
    setPending(true);
    const result = await refreshClubBookingInvitesAction({
      locale,
      bookingId: slot.bookingId,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    applyResult(result.invites);
  };

  const pendingWithoutUrl = invites.filter((inv) => !inv.url).length;
  const canGenerate = emptySeats > 0 && invites.length === 0;
  const canRefresh = pendingWithoutUrl > 0;

  if (emptySeats <= 0 && invites.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <UserPlus className="h-4 w-4 text-[var(--gold)] mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-white">
            Inviter des joueurs · {slot.court} · {slot.time}–{slot.endTime}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)] mt-1 leading-relaxed">
            Réservation téléphone : envoyez un lien par WhatsApp. Le joueur pourra payer{" "}
            <strong className="text-white/90">sur place</strong> sans Jetons KIF ({slot.sharePrice}{" "}
            DT / place).
          </p>
        </div>
      </div>

      {canGenerate ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void generate()}
          className={cn(
            "tap-target w-full min-h-[40px] rounded-lg px-3 py-2 text-xs font-bold",
            pending ? "bg-white/10 text-white/50" : "bg-[var(--gold)] text-black",
          )}
        >
          {pending
            ? "Génération…"
            : `Générer ${emptySeats} lien${emptySeats > 1 ? "s" : ""} d'invitation`}
        </button>
      ) : null}

      {canRefresh ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void refresh()}
          className="tap-target w-full min-h-[40px] rounded-lg px-3 py-2 text-xs font-bold border border-[var(--gold)] text-[var(--gold)]"
        >
          {pending ? "Regénération…" : "Afficher et partager les liens"}
        </button>
      ) : null}

      {invites.length > 0 ? (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.inviteId}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)]/60 p-2 space-y-1"
            >
              <p className="text-[10px] font-bold text-white">
                Place {invite.seatIndex} · {invite.sharePrice || slot.sharePrice} DT
              </p>
              {invite.url ? (
                <>
                  <p className="text-[9px] text-[var(--foreground-muted)] break-all">{invite.url}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void shareBookingInviteLink(
                        invite.url,
                        invite.sharePrice || slot.sharePrice,
                        clubName,
                      );
                      setCopiedId(invite.inviteId);
                      window.setTimeout(() => setCopiedId(null), 2500);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--gold)]"
                  >
                    <Share2 className="h-3 w-3" />
                    {copiedId === invite.inviteId ? "Copié / partagé" : "Partager (WhatsApp…)"}
                  </button>
                </>
              ) : (
                <p className="text-[9px] text-amber-400 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Lien actif — regénérez pour afficher l&apos;URL
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-[10px] text-rose-400">{error}</p> : null}
    </div>
  );
}
