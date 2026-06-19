"use client";

import { useState } from "react";
import { Link2, Share2, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buildBookingInviteUrl } from "@/modules/bookings/split-payment-repository";
import { createBookingSplitInvitesAction } from "@/modules/bookings/actions/split-payment";
import { shareBookingInviteLink } from "@/lib/bookings/share-invite";
import type { BookingSplitInvite } from "@/modules/bookings/split-payment-repository";

type Props = {
  locale: string;
  bookingId: string;
  clubName: string;
  sharePrice: number;
  existingInvites: BookingSplitInvite[];
  emptySeats: number;
};

type InviteWithLink = BookingSplitInvite & { url: string };

export function BookingSplitInvitesPanel({
  locale,
  bookingId,
  clubName,
  sharePrice,
  existingInvites,
  emptySeats,
}: Props) {
  const [invites, setInvites] = useState<InviteWithLink[]>(() =>
    existingInvites
      .filter((inv) => inv.status === "pending")
      .map((inv) => ({ ...inv, url: "" })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const generateLinks = async () => {
    setError("");
    setPending(true);

    const result = await createBookingSplitInvitesAction({ locale, bookingId });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const withUrls = result.invites.map((inv) => ({
      ...inv,
      url: buildBookingInviteUrl(origin, locale, inv.inviteId, inv.inviteToken),
    }));

    setInvites(withUrls);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `booking-invites:${bookingId}`,
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

  const onShare = async (invite: InviteWithLink) => {
    if (!invite.url) return;
    await shareBookingInviteLink(invite.url, invite.sharePrice || sharePrice, clubName);
    setCopiedId(invite.inviteId);
    window.setTimeout(() => setCopiedId(null), 2500);
  };

  const pendingWithoutUrl = invites.filter((inv) => !inv.url).length;
  const canGenerate = emptySeats > 0 && invites.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/10">
          <Users className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Paiement partagé</h2>
          <p className="text-xs text-[var(--foreground-muted)] mt-1 leading-relaxed">
            Vous avez payé votre part ({sharePrice} DT). Générez jusqu&apos;à {emptySeats} lien
            {emptySeats > 1 ? "s" : ""} pour vos partenaires — chacun paie sa part via Jetons KIF.
            Les liens expirent selon le règlement du club (par défaut 24 h).
          </p>
        </div>
      </div>

      {canGenerate ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void generateLinks()}
          className={cn(
            "tap-target w-full min-h-[44px] rounded-xl px-4 py-2 text-sm font-bold",
            pending ? "bg-white/10 text-white/50" : "bg-[var(--gold)] text-black",
          )}
        >
          {pending ? "Génération…" : `Générer ${emptySeats} lien${emptySeats > 1 ? "s" : ""} de paiement`}
        </button>
      ) : null}

      {invites.length > 0 ? (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.inviteId}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)]/50 p-3 space-y-2"
            >
              <p className="text-xs font-bold text-white">
                Place {invite.seatIndex} · {invite.sharePrice || sharePrice} DT
              </p>
              {invite.url ? (
                <>
                  <p className="text-[10px] text-[var(--foreground-muted)] break-all">{invite.url}</p>
                  <button
                    type="button"
                    onClick={() => void onShare(invite)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--gold)] hover:underline"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {copiedId === invite.inviteId ? "Lien copié / partagé" : "Partager le lien"}
                  </button>
                </>
              ) : (
                <p className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Lien actif — regénérez si vous n&apos;avez plus le token
                </p>
              )}
              <p className="text-[10px] text-[var(--foreground-muted)]">
                Expire le{" "}
                {new Date(invite.expiresAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {pendingWithoutUrl > 0 && !canGenerate ? (
        <p className="text-xs text-[var(--foreground-muted)]">
          Des invitations sont actives. Si vous n&apos;avez plus les liens complets, attendez leur
          expiration pour en regénérer.
        </p>
      ) : null}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
