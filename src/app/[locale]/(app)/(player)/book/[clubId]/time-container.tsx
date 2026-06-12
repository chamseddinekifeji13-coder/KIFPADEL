"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TimeSlotGrid } from "@/components/features/bookings/time-slot-grid";
import { PaymentMethodSelector } from "@/components/features/bookings/payment-method-selector";
import { BookingConfirmSheet } from "@/components/features/bookings/booking-confirm-sheet";
import { type TimeSlot } from "@/modules/bookings/availability-service";
import { buildTunisSlotTimestamps } from "@/modules/bookings/timezone";
import { createBookingAction } from "@/modules/bookings/actions";
import { DEFAULT_BOOKING_DURATION_MINUTES } from "@/modules/bookings/constants";
import { ChevronRight, ShieldAlert } from "lucide-react";

interface TimeContainerProps {
  slots: TimeSlot[];
  date: string;
  clubId: string;
  clubName: string;
  /** Doit être identique au pas de la grille (`club.slot_duration_minutes`). */
  bookingDurationMinutes?: number;
  /** Offre « location » valide (club activé + prix unitaire &gt; 0). */
  racketRentalOffered?: boolean;
  racketPricePerUnit?: number;
  playerTrustScore?: number;
  playerReliability?: string;
}

const MAX_RACKETS_UI = 8;

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
}: TimeContainerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [racketQty, setRacketQty] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "on_site" | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [bookingState, setBookingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSlotData = slots.find((s) => s.id === selectedSlot);
  const slotBasePrice = selectedSlotData?.price ?? 40;
  const courtId = selectedSlotData?.courtId ?? "";
  const slotTime = selectedSlotData?.time ?? "";

  const racketUnit = racketRentalOffered && racketPricePerUnit > 0 ? racketPricePerUnit : 0;
  const sanitizedRacketQty =
    racketUnit > 0 ? Math.min(MAX_RACKETS_UI, Math.max(0, Math.floor(racketQty))) : 0;

  useEffect(() => {
    setRacketQty(0);
  }, [selectedSlot]);

  const { basePrice, racketFee, totalPrice } = useMemo(() => {
    const fee =
      sanitizedRacketQty > 0 && racketUnit > 0
        ? Math.round(sanitizedRacketQty * racketUnit * 100) / 100
        : 0;
    const base = slotBasePrice;
    return {
      basePrice: base,
      racketFee: fee,
      totalPrice: Math.round((base + fee) * 100) / 100,
    };
  }, [slotBasePrice, racketUnit, sanitizedRacketQty]);

  const isRestricted = playerReliability === "restricted" || playerTrustScore < 45;
  const isBlacklisted = playerReliability === "blacklisted" || playerTrustScore < 25;

  const handleBookingClick = () => {
    if (isBlacklisted) return;
    if (isRestricted && paymentMethod !== "online") {
      setPaymentMethod("online");
    }
    setBookingState("idle");
    setErrorMessage(null);
    setShowConfirmSheet(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !paymentMethod || !courtId || !slotTime || isPending) return;

    setBookingState("loading");
    setErrorMessage(null);

    let startsAtIso: string;
    let endsAtIso: string;
    try {
      const built = buildTunisSlotTimestamps(date, slotTime, bookingDurationMinutes);
      startsAtIso = built.startsAtIso;
      endsAtIso = built.endsAtIso;
    } catch {
      setBookingState("error");
      setErrorMessage("Date ou heure du créneau invalide. Rechargez la page et réessayez.");
      return;
    }

    try {
      const result = await createBookingAction({
        clubId,
        courtId,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        paymentMethod,
        racketRentalQty: sanitizedRacketQty,
        clientTotalHint: totalPrice,
      });

      if (result.ok) {
        setBookingState("success");
        setTimeout(() => {
          setShowConfirmSheet(false);
          setSelectedSlot(null);
          setPaymentMethod(null);
          setRacketQty(0);
          setBookingState("idle");
          router.refresh();
        }, 2000);
      } else {
        setBookingState("error");
        setErrorMessage(result.error);
      }
    } catch (err) {
      console.error("[TimeContainer] createBookingAction failed", err);
      setBookingState("error");
      setErrorMessage("Connexion interrompue. Vérifiez le réseau et réessayez.");
    }
  };

  const showRacketRow = racketUnit > 0;

  return (
    <div className="space-y-6">
      <TimeSlotGrid slots={slots} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />

      {selectedSlot && !isBlacklisted ? (
        <div
          className="h-72 pb-[max(env(safe-area-inset-bottom),0px)] shrink-0"
          aria-hidden
        />
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
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                <label
                  htmlFor="racket-qty-select"
                  className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-2"
                >
                  <span>Location de raquettes</span>
                  <span className="text-[var(--gold)]">{racketUnit} DT / unité</span>
                </label>
                <select
                  id="racket-qty-select"
                  value={sanitizedRacketQty}
                  onChange={(e) => setRacketQty(Number.parseInt(e.target.value, 10))}
                  className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-white"
                >
                  <option value={0}>0 — J&apos;apporte mes raquettes</option>
                  {Array.from({ length: MAX_RACKETS_UI }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} raquette{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                {sanitizedRacketQty > 0 ? (
                  <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                    Supplément raquettes :{" "}
                    <span className="font-bold text-[var(--gold)]">{racketFee} DT</span> · Total estimé{" "}
                    <span className="font-bold text-white">{totalPrice} DT</span> (confirmé au paiement après
                    validation serveur)
                  </p>
                ) : null}
              </div>
            ) : null}

            <PaymentMethodSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              isRestricted={isRestricted}
              price={totalPrice}
            />

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Résumé
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {slotTime} • {selectedSlotData?.courtLabel} •{" "}
                  {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (paymentMethod && !isPending) handleBookingClick();
                }}
                disabled={!paymentMethod || isPending}
                className="flex-1 min-h-[48px] bg-[var(--gold)] hover:bg-[var(--gold-dark)] disabled:bg-[var(--border)] disabled:text-[var(--foreground-muted)] text-black h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:active:scale-100 touch-manipulation cursor-pointer select-none"
              >
                Réserver • {totalPrice} DT
                <ChevronRight className="h-4 w-4" />
              </button>
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
        racketQty={sanitizedRacketQty}
        racketFee={racketFee}
        state={bookingState}
        errorMessage={errorMessage}
      />
    </div>
  );
}
