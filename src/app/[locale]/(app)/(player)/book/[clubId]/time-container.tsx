"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TimeSlotGrid } from "@/components/features/bookings/time-slot-grid";
import { PaymentMethodSelector } from "@/components/features/bookings/payment-method-selector";
import { BookingConfirmSheet } from "@/components/features/bookings/booking-confirm-sheet";
import { type TimeSlot } from "@/modules/bookings/availability-service";
import { createBookingAction } from "@/modules/bookings/actions";
import { DEFAULT_BOOKING_DURATION_MINUTES } from "@/modules/bookings/constants";
import { ChevronRight, ShieldAlert } from "lucide-react";

interface TimeContainerProps {
  slots: TimeSlot[];
  date: string;
  clubId: string;
  clubName: string;
  playerTrustScore?: number;
  playerReliability?: string;
}

export function TimeContainer({ 
  slots, 
  date, 
  clubId,
  clubName,
  playerTrustScore = 70,
  playerReliability = "healthy",
}: TimeContainerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "on_site" | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [bookingState, setBookingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get the selected slot's data for price and court (match by unique ID)
  const selectedSlotData = slots.find(s => s.id === selectedSlot);
  const slotPrice = selectedSlotData?.price ?? 40;
  const courtId = selectedSlotData?.courtId ?? "";
  const slotTime = selectedSlotData?.time ?? "";

  // Determine if player is restricted (must pay online)
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
    if (!selectedSlot || !paymentMethod || !courtId || !slotTime) return;

    setBookingState("loading");
    setErrorMessage(null);

    // Calculate start and end times using the time from the slot data
    const [hours, minutes] = slotTime.split(":").map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(hours, minutes, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + DEFAULT_BOOKING_DURATION_MINUTES);

    startTransition(async () => {
      const result = await createBookingAction({
        clubId,
        courtId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        totalPrice: slotPrice,
        paymentMethod,
      });

      if (result.ok) {
        setBookingState("success");
        // Reset after showing success
        setTimeout(() => {
          setShowConfirmSheet(false);
          setSelectedSlot(null);
          setPaymentMethod(null);
          setBookingState("idle");
          router.refresh(); // Refresh to update slot availability
        }, 2000);
      } else {
        setBookingState("error");
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <TimeSlotGrid
        slots={slots}
        selectedSlot={selectedSlot}
        onSelect={setSelectedSlot}
      />

      {/* Blacklisted Warning */}
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

      {/* Floating Action Bar when slot selected */}
      {selectedSlot && !isBlacklisted && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)] animate-in slide-in-from-bottom-2 duration-300 z-[70] pb-28 sm:pb-4">
          <div className="max-w-lg mx-auto p-4 space-y-4">
            {/* Payment Method Selector */}
            <PaymentMethodSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              isRestricted={isRestricted}
              price={slotPrice}
            />

            {/* Summary and Book Button */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Résumé
                </span>
                <span className="text-sm font-bold text-white">
                  {slotTime} • {selectedSlotData?.courtLabel} • {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              
              <button
                onClick={handleBookingClick}
                disabled={!paymentMethod || isPending}
                className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)] disabled:bg-[var(--border)] disabled:text-[var(--foreground-muted)] text-black h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:active:scale-100"
              >
                Réserver • {slotPrice} DT
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Sheet */}
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
        price={slotPrice}
        state={bookingState}
        errorMessage={errorMessage}
      />
    </div>
  );
}
