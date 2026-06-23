"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buildBookingInviteUrl } from "@/lib/bookings/invite-url";
import {
  createBookingSplitInvitesAction,
  refreshBookingSplitInvitesAction,
} from "@/modules/bookings/actions/split-payment";
import { findPlayersBookingInvitePath } from "@/lib/booking-paths";
import {
  copyBookingInviteUrl,
  setActiveBookingInvite,
} from "@/lib/bookings/share-invite";
import {
  getRelevantSharedInviteIds,
} from "@/lib/bookings/invite-shared-storage";
import { loadStoredBookingInvites, persistInviteLinks } from "@/lib/bookings/invite-session";
import type { BookingSplitInvite } from "@/modules/bookings/split-payment-repository";

type Props = {
  locale: string;
  bookingId: string;
  clubName: string;
  sharePrice: number;
  existingInvites: BookingSplitInvite[];
  emptySeats: number;
  partnerTargetCount: number;
};

type InviteWithLink = BookingSplitInvite & { url: string };

function attachUrls(
  origin: string,
  locale: string,
  items: BookingSplitInvite[],
): InviteWithLink[] {
  return items.map((inv) => ({
    ...inv,
    url: inv.inviteToken
      ? buildBookingInviteUrl(origin, locale, inv.inviteId, inv.inviteToken)
      : "",
  }));
}

function persistInvites(bookingId: string, items: InviteWithLink[]) {
  persistInviteLinks(
    bookingId,
    items.map((inv) => ({
      inviteId: inv.inviteId,
      inviteToken: inv.inviteToken,
      url: inv.url,
      expiresAt: inv.expiresAt,
    })),
  );
}

export function BookingSplitInvitesPanel({
  locale,
  bookingId,
  clubName,
  sharePrice,
  existingInvites,
  emptySeats,
  partnerTargetCount,
}: Props) {
  const router = useRouter();
  const [invites, setInvites] = useState<InviteWithLink[]>(() =>
    existingInvites
      .filter((inv) => inv.status === "pending")
      .map((inv) => ({ ...inv, url: "" })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sharedIds, setSharedIds] = useState<Set<string>>(() => new Set());
  const [showUrls, setShowUrls] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pendingInviteIds = invites.map((inv) => inv.inviteId);
  const isEn = locale === "en";
  const totalToInvite = Math.max(partnerTargetCount, invites.length);
  const sharedCount = sharedIds.size;
  const quotaReached = totalToInvite > 0 && sharedCount >= totalToInvite;
  const remainingCount = Math.max(0, totalToInvite - sharedCount);
  const nextUnsharedInvite = invites.find((inv) => !sharedIds.has(inv.inviteId));

  useEffect(() => {
    if (typeof window === "undefined" || invites.length === 0) return;
    const stored = loadStoredBookingInvites(bookingId);
    if (stored.length === 0) return;
    setInvites((prev) =>
      prev.map((inv) => {
        if (inv.url) return inv;
        const hit = stored.find((s) => s.inviteId === inv.inviteId);
        if (!hit?.token) return inv;
        return {
          ...inv,
          inviteToken: hit.token,
          expiresAt: hit.expiresAt ?? inv.expiresAt,
          url: hit.url || buildBookingInviteUrl(origin, locale, inv.inviteId, hit.token),
        };
      }),
    );
  }, [bookingId, locale, origin, invites.length]);

  useEffect(() => {
    const syncShared = () =>
      setSharedIds(getRelevantSharedInviteIds(bookingId, invites.map((inv) => inv.inviteId)));
    syncShared();
    const onShared = (event: Event) => {
      const detail = (event as CustomEvent<{ bookingId: string }>).detail;
      if (detail?.bookingId === bookingId) syncShared();
    };
    window.addEventListener("kifpadel:booking-invite-shared", onShared);
    window.addEventListener("focus", syncShared);
    return () => {
      window.removeEventListener("kifpadel:booking-invite-shared", onShared);
      window.removeEventListener("focus", syncShared);
    };
  }, [bookingId, invites]);

  useEffect(() => {
    if (!copyToast) return;
    const timer = window.setTimeout(() => setCopyToast(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copyToast]);

  const applyInviteResult = (items: BookingSplitInvite[]) => {
    const withUrls = attachUrls(origin, locale, items);
    setInvites(withUrls);
    persistInvites(bookingId, withUrls);
    return withUrls;
  };

  const ensureLinks = async (): Promise<InviteWithLink[]> => {
    setError("");
    setPending(true);

    const withUrl = invites.filter((inv) => inv.url);
    if (withUrl.length > 0) {
      setPending(false);
      return withUrl;
    }

    if (invites.length > 0) {
      const refreshed = await refreshBookingSplitInvitesAction({ locale, bookingId });
      setPending(false);
      if (!refreshed.ok) {
        setError(refreshed.error);
        return [];
      }
      return applyInviteResult(refreshed.invites);
    }

    const created = await createBookingSplitInvitesAction({ locale, bookingId });
    setPending(false);
    if (!created.ok) {
      setError(created.error);
      return [];
    }
    return applyInviteResult(created.invites);
  };

  const goToPlayersWithInvite = async (invite: InviteWithLink) => {
    if (sharedIds.has(invite.inviteId)) return;

    let target = invite;
    if (!target.url) {
      const ready = await ensureLinks();
      target = ready.find((inv) => inv.inviteId === invite.inviteId) ?? ready[0] ?? invite;
      if (!target?.url) return;
    }

    const copied = await copyBookingInviteUrl(target.url);
    if (copied) setCopyToast(true);
    setActiveBookingInvite(bookingId, target.inviteId);
    router.push(
      findPlayersBookingInvitePath(
        locale,
        bookingId,
        clubName,
        target.sharePrice || sharePrice,
        target.inviteId,
      ),
    );
  };

  const shareFirstLink = async () => {
    if (quotaReached) return;
    const ready = await ensureLinks();
    const next = ready.find((inv) => inv.url && !sharedIds.has(inv.inviteId));
    if (!next?.url) return;
    await goToPlayersWithInvite(next);
  };

  const pendingWithoutUrl = invites.filter((inv) => !inv.url).length;
  const canStart = emptySeats > 0 && invites.length === 0 && !quotaReached;

  return (
    <div className="space-y-4 relative">
      {copyToast ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg"
        >
          {isEn ? "Link copied ✓" : "Lien copié ✓"}
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/10">
          <Users className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">
            {isEn ? "Shared payment" : "Paiement partagé"}
          </h2>
          <p className="text-xs text-[var(--foreground-muted)] mt-1 leading-relaxed">
            {isEn ? (
              <>
                Your share ({sharePrice} DT) is paid. Tap <strong className="text-white/90">Share link</strong>{" "}
                — the link is copied and you pick a Kifpadel player to send it to.
              </>
            ) : (
              <>
                Votre part ({sharePrice} DT) est réglée. Appuyez sur <strong className="text-white/90">Partager le lien</strong>{" "}
                : le lien est copié et vous choisissez un joueur Kifpadel à qui l&apos;envoyer.
              </>
            )}
          </p>
          {totalToInvite > 0 ? (
            <p className="text-[10px] font-bold text-[var(--gold)] mt-2 uppercase tracking-wider">
              {isEn
                ? `${sharedCount}/${totalToInvite} partners invited`
                : `${sharedCount}/${totalToInvite} partenaires invités`}
            </p>
          ) : null}
        </div>
      </div>

      {quotaReached ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-100">
                {isEn ? "Target reached" : "Nombre atteint"}
              </p>
              <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                {isEn
                  ? "You have invited all the partners needed for this court. They can pay via the link you sent."
                  : "Vous avez atteint le nombre de partenaires à inviter. Ils peuvent régler leur part via le lien envoyé."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {canStart ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void shareFirstLink()}
          className={cn(
            "tap-target w-full min-h-[48px] rounded-xl px-4 py-2 text-sm font-black uppercase tracking-wide",
            pending ? "bg-white/10 text-white/50" : "bg-[var(--gold)] text-black",
          )}
        >
          {pending
            ? isEn
              ? "Preparing…"
              : "Préparation…"
            : isEn
              ? `Share link (${remainingCount})`
              : `Partager le lien (${remainingCount})`}
        </button>
      ) : null}

      {!quotaReached && sharedCount > 0 && nextUnsharedInvite ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void goToPlayersWithInvite(nextUnsharedInvite)}
          className={cn(
            "tap-target w-full min-h-[48px] rounded-xl px-4 py-2 text-sm font-black uppercase tracking-wide",
            pending ? "bg-white/10 text-white/50" : "bg-[var(--gold)] text-black",
          )}
        >
          {pending
            ? "…"
            : isEn
              ? `Next partner — seat ${nextUnsharedInvite.seatIndex} (${remainingCount} left)`
              : `Partenaire suivant — place ${nextUnsharedInvite.seatIndex} (${remainingCount} restant${remainingCount > 1 ? "s" : ""})`}
        </button>
      ) : null}

      {invites.length > 0 ? (
        <ul className="space-y-2">
          {invites.map((invite) => {
            const invited = sharedIds.has(invite.inviteId);
            const isNext = !invited && invite.inviteId === nextUnsharedInvite?.inviteId;
            return (
              <li
                key={invite.inviteId}
                className={cn(
                  "rounded-xl border bg-[var(--background)]/50 p-3 space-y-2",
                  isNext ? "border-[var(--gold)]/60 ring-1 ring-[var(--gold)]/30" : "border-[var(--border)]",
                )}
              >
                <p className="text-xs font-bold text-white">
                  {isEn ? "Seat" : "Place"} {invite.seatIndex} · {invite.sharePrice || sharePrice} DT
                </p>
                <button
                  type="button"
                  disabled={pending || invited}
                  onClick={() => void goToPlayersWithInvite(invite)}
                  className={cn(
                    "tap-target w-full min-h-[44px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    invited
                      ? "border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 cursor-not-allowed"
                      : "bg-[var(--gold)] text-black hover:opacity-90 active:scale-[0.98]",
                    pending && "opacity-50",
                  )}
                >
                  {pending
                    ? "…"
                    : invited
                      ? isEn
                        ? "Invited"
                        : "Invité"
                      : isEn
                        ? "Share link"
                        : "Partager le lien"}
                </button>
                {showUrls && invite.url ? (
                  <p className="text-[10px] text-[var(--foreground-muted)] break-all">{invite.url}</p>
                ) : null}
                <p className="text-[10px] text-[var(--foreground-muted)]">
                  {isEn ? "Expires" : "Expire le"}{" "}
                  {new Date(invite.expiresAt).toLocaleString(isEn ? "en-GB" : "fr-FR")}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}

      {pendingWithoutUrl > 0 && !canStart ? (
        <button
          type="button"
          disabled={pending || quotaReached}
          onClick={() => void ensureLinks()}
          className="tap-target w-full min-h-[40px] rounded-xl border border-[var(--gold)] text-[var(--gold)] text-xs font-bold disabled:opacity-40"
        >
          {pending ? "…" : isEn ? "Restore invite links" : "Restaurer les liens d'invitation"}
        </button>
      ) : null}

      {invites.some((inv) => inv.url) ? (
        <button
          type="button"
          onClick={() => setShowUrls((v) => !v)}
          className="text-[10px] text-[var(--foreground-muted)] underline w-full text-center"
        >
          {showUrls
            ? isEn
              ? "Hide links"
              : "Masquer les liens"
            : isEn
              ? "Show link (manual copy)"
              : "Afficher le lien (copie manuelle)"}
        </button>
      ) : null}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
