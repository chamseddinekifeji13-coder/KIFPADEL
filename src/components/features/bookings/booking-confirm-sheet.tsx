"use client";

import { X, MapPin, Calendar, Clock, CreditCard, Banknote, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface BookingConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  clubName: string;
  date: string;
  time: string;
  paymentMethod: "online" | "on_site" | null;
  price: number;
  state?: "idle" | "loading" | "success" | "error";
  errorMessage?: string | null;
}

export function BookingConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  clubName,
  date,
  time,
  paymentMethod,
  price,
  state = "idle",
  errorMessage = null,
}: BookingConfirmSheetProps) {
  if (!isOpen) return null;

  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isError = state === "error";

  const handleConfirm = async () => {
    await onConfirm();
  };

  const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isLoading && onClose()}
      />
      
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] rounded-t-3xl animate-in slide-in-from-bottom duration-300">
        <div className="max-w-lg mx-auto p-6 space-y-6">
          {/* Handle */}
          <div className="flex justify-center">
            <div className="h-1 w-12 bg-[var(--border)] rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {isSuccess ? "Réservation confirmée" : isError ? "Erreur" : "Confirmer la réservation"}
            </h2>
            {!isLoading && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[var(--background)] transition-colors"
              >
                <X className="h-5 w-5 text-[var(--foreground-muted)]" />
              </button>
            )}
          </div>

          {/* Success State */}
          {isSuccess && (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">Réservation confirmée</p>
                <p className="text-sm text-[var(--foreground-muted)] mt-1">
                  {paymentMethod === "online" 
                    ? "Vous allez recevoir un lien de paiement par email"
                    : "Présentez-vous au club à l'heure indiquée"}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="py-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-400">Erreur de réservation</p>
                  <p className="text-xs text-red-400/80 mt-1">
                    {errorMessage ?? "Une erreur est survenue. Veuillez réessayer."}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full mt-4 bg-[var(--border)] hover:bg-[var(--surface-elevated)] text-white h-12 rounded-xl text-sm font-bold transition-all"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Normal / Loading State */}
          {!isSuccess && !isError && (
            <>
              {/* Booking Details */}
              <div className="bg-[var(--background)] rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[var(--gold)]" />
                  <span className="text-sm font-medium text-white">{clubName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-[var(--gold)]" />
                  <span className="text-sm font-medium text-white capitalize">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[var(--gold)]" />
                  <span className="text-sm font-medium text-white">{time} (1h30)</span>
                </div>
                <div className="flex items-center gap-3">
                  {paymentMethod === "online" ? (
                    <CreditCard className="h-4 w-4 text-[var(--gold)]" />
                  ) : (
                    <Banknote className="h-4 w-4 text-[var(--gold)]" />
                  )}
                  <span className="text-sm font-medium text-white">
                    {paymentMethod === "online" ? "Paiement en ligne" : "Paiement sur place"}
                  </span>
                </div>
              </div>

              {/* Price Summary */}
              <div className="flex items-center justify-between py-4 border-t border-[var(--border)]">
                <span className="text-sm text-[var(--foreground-muted)]">Total à payer</span>
                <span className="text-2xl font-black text-[var(--gold)]">{price} DT</span>
              </div>

              {/* No-show Warning */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-400 leading-relaxed">
                  En cas de no-show, votre score de confiance sera impacté et vos futures 
                  réservations pourront être restreintes.
                </p>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)] disabled:opacity-50 text-black h-14 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:active:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirmation en cours...
                  </>
                ) : paymentMethod === "online" ? (
                  `Payer ${price} DT`
                ) : (
                  "Confirmer la réservation"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
