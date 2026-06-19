"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaymentMethodSelector } from "@/components/features/bookings/payment-method-selector";
import { acceptBookingInviteAction } from "@/modules/bookings/actions/split-payment";
import type { BookingInvitePublic } from "@/modules/bookings/split-payment-repository";

type Props = {
  locale: string;
  invite: BookingInvitePublic;
  token: string;
  walletBalance: number;
  isRestricted: boolean;
};

export function BookingInviteAcceptForm({
  locale,
  invite,
  token,
  walletBalance,
  isRestricted,
}: Props) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "on_site" | null>("wallet");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
    return (
      <p className="text-sm text-rose-300">
        Cette invitation a expiré. Demandez à l&apos;organisateur un nouveau lien.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
