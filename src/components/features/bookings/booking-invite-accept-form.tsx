"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaymentMethodSelector } from "@/components/features/bookings/payment-method-selector";
import { acceptBookingInviteAction } from "@/modules/bookings/actions/split-payment";
import type { BookingInvitePublic } from "@/modules/bookings/split-payment-repository";
import { cn } from "@/lib/utils/cn";

type Props = {
  locale: string;
  invite: BookingInvitePublic;
  token: string;
  walletBalance: number;
  isRestricted: boolean;
  defaultPaymentMethod?: "wallet" | "on_site";
  racketUnitPrice?: number;
};
export function BookingInviteAcceptForm({
  locale,
  invite,
  token,
  walletBalance,
  isRestricted,
  defaultPaymentMethod,
  racketUnitPrice = 0,
}: Props) {
  const router = useRouter();
  const isEn = locale === "en";
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "on_site" | null>(
    defaultPaymentMethod ?? (isRestricted ? "wallet" : "on_site"),
  );
  const [rentRacket, setRentRacket] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const racketUnit = racketUnitPrice > 0 ? racketUnitPrice : 0;

  const onAccept = async () => {
    if (!paymentMethod || pending) return;

    setError("");
    setPending(true);

    const result = await acceptBookingInviteAction({
      locale,
      inviteId: invite.inviteId,
      token,
      paymentMethod,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(`/${locale}/bookings?joined=1`);
    router.refresh();
  };

  if (invite.isExpired) {
    const used = invite.status === "accepted";
    return (
      <p className="text-sm text-rose-300">
        {used
          ? isEn
            ? "This seat has already been taken. Ask the organizer for a new link if another spot is free."
            : "Cette place a déjà été prise. Demandez un nouveau lien à l'organisateur s'il reste une place."
          : isEn
            ? "This invitation has expired. Ask the organizer for a new link."
            : "Cette invitation a expiré. Demandez à l'organisateur un nouveau lien."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {racketUnit > 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            {isEn ? `Racket · ${racketUnit} DT` : `Raquette · ${racketUnit} DT`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRentRacket(false)}
              className={cn(
                "min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                !rentRacket
                  ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                  : "border-[var(--border)] text-[var(--foreground-muted)]",
              )}
            >
              {isEn ? "I have my racket" : "J'ai ma raquette"}
            </button>
            <button
              type="button"
              onClick={() => setRentRacket(true)}
              className={cn(
                "min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                rentRacket
                  ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                  : "border-[var(--border)] text-[var(--foreground-muted)]",
              )}
            >
              {isEn ? "I rent a racket" : "Je loue une raquette"}
            </button>
          </div>
          {rentRacket ? (
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {isEn
                ? `+${racketUnit} DT to pay at the club desk (not included in your share).`
                : `+${racketUnit} DT à régler au comptoir du club (hors part terrain).`}
            </p>
          ) : null}
        </div>
      ) : null}

      <PaymentMethodSelector
        locale={locale}
        selected={paymentMethod}
        onSelect={setPaymentMethod}
        isRestricted={isRestricted}
        price={invite.sharePrice}
        priceLabel={locale === "en" ? "Your share" : "Votre part"}
        walletBalance={walletBalance}
        walletHref={`/${locale}/profile/wallet`}
      />

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}

      <button
        type="button"
        disabled={pending || !paymentMethod}
        onClick={() => void onAccept()}
        className="tap-target w-full min-h-[48px] rounded-xl bg-[var(--gold)] text-black text-sm font-bold disabled:opacity-50"
      >
        {pending
          ? locale === "en"
            ? "Processing…"
            : "Traitement…"
          : locale === "en"
            ? `Pay my share (${invite.sharePrice} DT)`
            : `Payer ma part (${invite.sharePrice} DT)`}
      </button>
    </div>
  );
}
