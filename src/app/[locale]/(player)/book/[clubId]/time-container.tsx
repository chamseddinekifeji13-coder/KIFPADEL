"use client";

import { useState } from "react";
import { TimeSlotGrid } from "@/components/features/bookings/time-slot-grid";
import { PaymentMethodSelector } from "@/components/features/bookings/payment-method-selector";
import { BookingConfirmSheet } from "@/components/features/bookings/booking-confirm-sheet";
import { type TimeSlot } from "@/modules/bookings/availability-service";
import { ChevronRight, ShieldAlert } from "lucide-react";

interface TimeContainerProps {
  slots: TimeSlot[];
  date: string;
  clubName: string;
  playerTrustScore?: number;
  playerReliability?: string;
}

export function TimeContainer({ 
  slots, 
  date, 
  clubName,
  playerTrustScore = 70,
  playerReliability = "healthy",
}: TimeContainerProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "on_site" | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);

  // Determine if player is restricted (must pay online)
  const isRestricted = playerReliability === "restricted" || playerTrustScore < 45;
  const isBlacklisted = playerReliability === "blacklisted" || playerTrustScore < 25;

  // Get slot price (default 40 DT, would come from slot.price in production)
  const slotPrice = 40;

  const handleBookingClick = () => {
    if (isBlacklisted) {
      return; // Blocked
    }
    if (isRestricted && paymentMethod !== "online") {
      // Force online payment for restricted players
      setPaymentMethod("online");
    }
    setShowConfirmSheet(true);
  };

  const handleConfirmBooking = async () => {
    // This would call the server action to create the booking
    console.log("[v0] Booking confirmed:", {
      slot: selectedSlot,
      date,
      paymentMethod,
      price: slotPrice,
    });
    
    // For now, show success feedback
    setShowConfirmSheet(false);
    setSelectedSlot(null);
    setPaymentMethod(null);
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
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)] animate-in slide-in-from-bottom-2 duration-300 z-50">
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
                  {selectedSlot} • {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              
              <button
                onClick={handleBookingClick}
                disabled={!paymentMethod}
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
        onClose={() => setShowConfirmSheet(false)}
        onConfirm={handleConfirmBooking}
        clubName={clubName}
        date={date}
        time={selectedSlot ?? ""}
        paymentMethod={paymentMethod}
        price={slotPrice}
      />
    </div>
  );
}
