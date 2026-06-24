"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TimeSlotGrid } from "@/components/features/bookings/time-slot-grid";
import { PaymentMethodSelector, type PlayerPaymentMethod } from "@/components/features/bookings/payment-method-selector";
import { BookingConfirmSheet } from "@/components/features/bookings/booking-confirm-sheet";
import { type TimeSlot } from "@/modules/bookings/availability-service";
import { createBookingViaApi } from "@/lib/bookings/create-booking-client";
import { buildTunisSlotTimestamps, formatBookingDateShort } from "@/modules/bookings/timezone";
import { computeBookingTotals } from "@/modules/bookings/pricing-service";
import { DEFAULT_BOOKING_DURATION_MINUTES } from "@/modules/bookings/constants";
import { refreshAuthForServerAction } from "@/lib/auth/refresh-auth-for-server-action";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { mustUseWalletForBooking } from "@/modules/compliance/new-account-gates";

interface TimeContainerProps {
  slots: TimeSlot[];
  date: string;
  clubId: string;
  clubName: string;
  bookingDurationMinutes?: number;
  racketRentalOffered?: boolean;
  racketPricePerUnit?: number;
  playerTrustScore?: number;
  playerReliability?: string;
  playerCreatedAt?: string | null;
  walletBalance?: number;
  locale?: string;
}

export function TimeContainer({
  slots,
  date,
  clubId,
  clubName,
  bookingDurationMinutes = DEFAULT_BOOKING_DURATION_MINUTES,
  racketRentalOffered = false,
  racketPricePerUnit = 0,
  playerTrustScore = 70,
  playerReliability = "healthy",
  playerCreatedAt = null,
  walletBalance = 0,
  locale = "fr",
}: TimeContainerProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const confirmInFlightRef = useRef(false);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [rentRacket, setRentRacket] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PlayerPaymentMethod | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [bookingState, setBookingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSlotData = slots.find((s) => s.id === selectedSlot);
  const playerSharePrice = selectedSlotData?.price ?? 10;
  const courtId = selectedSlotData?.courtId ?? "";
  const slotTime = selectedSlotData?.time ?? "";
  const slotStartsAtIso = selectedSlotData?.startsAtIso ?? "";
  const slotEndsAtIso = selectedSlotData?.endsAtIso ?? "";

  const racketUnit = racketRentalOffered && racketPricePerUnit > 0 ? racketPricePerUnit : 0;
  const racketQty = racketUnit > 0 && rentRacket ? 1 : 0;

  useEffect(() => {
    setRentRacket(false);
  }, [selectedSlot]);

  const { basePrice, racketFee, totalPrice } = useMemo(
    () =>
      computeBookingTotals({
        club: {
          racket_rental_enabled: racketUnit > 0,
          racket_rental_price_per_unit: racketUnit > 0 ? racketUnit : null,
        },
        court: { price_per_player: playerSharePrice },
        startsAt: date,
        endsAt: date,
        racketRentalQtyRequested: racketQty,
      }),
    [playerSharePrice, racketUnit, racketQty, date],
  );

  const isRestricted = mustUseWalletForBooking({
    trust_score: playerTrustScore,
    created_at: playerCreatedAt,
  });
  const isBlacklisted =
    playerReliability === "blacklisted" || playerTrustScore < 25;

  useEffect(() => {
    if (isRestricted && paymentMethod === "on_site") {
      setPaymentMethod("wallet");
    }
  }, [isRestricted, paymentMethod]);

  useEffect(() => {
    if (!selectedSlot) {
      setPaymentMethod(null);
      return;
    }
    if (isRestricted) {
      setPaymentMethod(walletBalance >= totalPrice ? "wallet" : null);
      return;
    }
    setPaymentMethod("on_site");
  }, [selectedSlot, isRestricted, walletBalance, totalPrice]);

  const walletInsufficient =
    paymentMethod === "wallet" && totalPrice > 0 && walletBalance < totalPrice;
  const canReserve = Boolean(paymentMethod) && !walletInsufficient && !isPending;
  const handleBookingClick = () => {
    if (isBlacklisted || walletInsufficient) return;
    if (isRestricted && paymentMethod !== "wallet") {
      setPaymentMethod("wallet");
    }
    setBookingState("idle");
    setErrorMessage(null);
    setShowConfirmSheet(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !paymentMethod || !courtId || !slotTime || isPending || confirmInFlightRef.current) {
      return;
    }

    confirmInFlightRef.current = true;
    setBookingState("loading");
    setErrorMessage(null);
    setIsPending(true);

    let startsAtIso: string;
    let endsAtIso: string;
    if (slotStartsAtIso && slotEndsAtIso) {
      startsAtIso = slotStartsAtIso;
      endsAtIso = slotEndsAtIso;
    } else {
      try {
        const built = buildTunisSlotTimestamps(date, slotTime, bookingDurationMinutes);
        startsAtIso = built.startsAtIso;
        endsAtIso = built.endsAtIso;
      } catch {
        setBookingState("error");
        setErrorMessage("Date ou heure du créneau invalide. Rechargez la page et réessayez.");
        setIsPending(false);
        confirmInFlightRef.current = false;
        return;
      }
    }

    const authRefresh = await refreshAuthForServerAction();
    if (!authRefresh.ok) {
      setBookingState("error");
      setErrorMessage(authRefresh.error ?? "Session expirée. Rechargez la page puis reconnectez-vous.");
      setIsPending(false);
      confirmInFlightRef.current = false;
      return;
    }

    try {
      const result = await createBookingViaApi({
        clubId,
        courtId,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        paymentMethod,
        racketRentalQty: racketQty,
        clientTotalHint: totalPrice,
      });

      if (!result || typeof result !== "object" || !("ok" in result)) {
        setBookingState("error");
        setErrorMessage("Réponse serveur inattendue. Rechargez la page puis réessayez.");
        setIsPending(false);
        confirmInFlightRef.current = false;
        return;
      }

      if (result.ok) {
        setBookingState("success");
        setIsPending(false);
        confirmInFlightRef.current = false;
        setTimeout(() => {
          setShowConfirmSheet(false);
          setSelectedSlot(null);
          setPaymentMethod(null);
          setRentRacket(false);
          setBookingState("idle");
          if (result.bookingId) {
            router.push(`/${locale}/bookings/${result.bookingId}/invites`);
          } else {
            router.refresh();
          }
        }, 1500);
      } else {
        setBookingState("error");
        setErrorMessage(result.error?.trim() || "Impossible de créer la réservation. Réessayez.");
        setIsPending(false);
        confirmInFlightRef.current = false;
      }
    } catch (err) {
      console.error("[TimeContainer] createBookingViaApi failed", err);
      const message = err instanceof Error ? err.message : "";
      const staleAction =
        /server action/i.test(message) ||
        /failed to find server action/i.test(message) ||
        /action not found/i.test(message);
      setBookingState("error");
      setErrorMessage(
        staleAction
          ? "L'application a été mise à jour. Rechargez la page puis réessayez."
          : "Connexion interrompue. Vérifiez le réseau et réessayez.",
      );
      setIsPending(false);
      confirmInFlightRef.current = false;
    }
  };

  const showRacketRow = racketUnit > 0;

  return (
    <div className="space-y-6">
      <TimeSlotGrid slots={slots} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />

      {selectedSlot && !isBlacklisted ? (
        <div className="h-72 pb-[max(env(safe-area-inset-bottom),0px)] shrink-0" aria-hidden />
      ) : null}

      {isBlacklisted && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400">Compte suspendu</p>
            <p className="text-xs text-red-400/80 mt-1">
              Vous ne pouvez pas effectuer de réservations. Contactez le support.
            </p>
          </div>
        </div>
      )}

      {selectedSlot && !isBlacklisted && !showConfirmSheet && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[70] bg-[var(--surface)] border-t border-[var(--border)] pb-[max(env(safe-area-inset-bottom),0px)] max-md:shadow-[0_-8px_32px_rgba(0,0,0,0.45)] md:bg-[var(--surface)]/95 md:backdrop-blur-xl sm:pb-4"
        >
          <div className="max-w-lg mx-auto p-4 space-y-4">
            {showRacketRow ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Raquette · {racketUnit} DT
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRentRacket(false)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                      !rentRacket
                        ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                        : "border-[var(--border)] text-[var(--foreground-muted)]"
                    }`}
                  >
                    J&apos;ai ma raquette
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentRacket(true)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                      rentRacket
                        ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                        : "border-[var(--border)] text-[var(--foreground-muted)]"
                    }`}
                  >
                    Je loue une raquette
                  </button>
                </div>
              </div>
            ) : null}

            <PaymentMethodSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              isRestricted={isRestricted}
              price={totalPrice}
              priceLabel={locale === "en" ? "Your share" : "Votre part"}
              walletBalance={walletBalance}
              walletHref={`/${locale}/profile/wallet`}
              locale={locale}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  {locale === "en" ? "Your share" : "Votre part"}
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {slotTime} • {selectedSlotData?.courtLabel} •{" "}
                  {formatBookingDateShort(date, locale)}
                </span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {basePrice} DT créneau
                  {racketFee > 0 ? ` + ${racketFee} DT raquette` : ""}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (canReserve) handleBookingClick();
                }}
                disabled={!canReserve}
                className="flex-1 min-h-[48px] bg-[var(--gold)] hover:bg-[var(--gold-dark)] disabled:bg-[var(--border)] disabled:text-[var(--foreground-muted)] text-black h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:active:scale-100 touch-manipulation cursor-pointer select-none"
              >
                {locale === "en" ? "Book" : "Réserver"} • {totalPrice} DT
                <ChevronRight className="h-4 w-4" />
              </button>
              </div>
              {walletInsufficient ? (
                <p className="text-[10px] text-amber-300 text-center">
                  {locale === "en"
                    ? "Top up your KIF wallet to book with tokens."
                    : "Rechargez vos Jetons KIF pour réserver."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <BookingConfirmSheet
        isOpen={showConfirmSheet}
        onClose={() => {
          if (bookingState !== "loading") {
            setShowConfirmSheet(false);
            setBookingState("idle");
            setErrorMessage(null);
          }
        }}
        onConfirm={handleConfirmBooking}
        clubName={clubName}
        date={date}
        time={slotTime}
        courtName={selectedSlotData?.courtLabel}
        paymentMethod={paymentMethod}
        price={totalPrice}
        baseSlotPrice={basePrice}
        racketQty={racketQty}
        racketFee={racketFee}
        state={bookingState}
        errorMessage={errorMessage}
        locale={locale}
      />
    </div>
  );
}
