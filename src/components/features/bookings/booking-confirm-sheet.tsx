"use client";

import { X, MapPin, Calendar, CreditCard, Banknote, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface BookingConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  clubName: string;
  date: string;
  time: string;
  courtName?: string;
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
  courtName,
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
      <div className="absolute bottom-0 left-0 right-0 glass-gold rounded-t-[3rem] animate-slide-up shadow-premium">
        <div className="max-w-lg mx-auto p-8 space-y-8">
          {/* Handle */}
          <div className="flex justify-center -mt-2">
            <div className="h-1.5 w-16 bg-white/10 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {isSuccess ? "Succès" : isError ? "Erreur" : "Réservation"}
            </h2>
            {!isLoading && (
              <button
                onClick={onClose}
                title="Fermer"
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="h-6 w-6 text-foreground-muted" />
              </button>
            )}
          </div>

          {/* Success State */}
          {isSuccess && (
            <div className="py-12 flex flex-col items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-black text-white uppercase tracking-tight">C&apos;est confirmé !</p>
                <p className="text-sm text-foreground-muted mt-2 max-w-[280px]">
                  {paymentMethod === "online"
                    ? "Réservation enregistrée en « attente paiement ». Il n'y a pas encore de prélèvement automatique ni d'e-mail avec lien : le club vous indiquera comment payer."
                    : "Votre créneau est bien réservé. Rendez-vous au club pour le paiement."}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="py-6">
              <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-danger uppercase tracking-wide">Erreur de réservation</p>
                  <p className="text-xs text-danger/80 mt-1 leading-relaxed">
                    {errorMessage ?? "Une erreur est survenue. Veuillez réessayer."}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full mt-6 bg-surface-elevated hover:bg-surface text-white h-14 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Normal / Loading State */}
          {!isSuccess && !isError && (
            <>
              {/* Booking Details */}
              <div className="bg-surface-elevated/50 border border-white/5 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <MapPin className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground-muted tracking-widest">Club</p>
                    <p className="text-sm font-black text-white">{clubName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <Calendar className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground-muted tracking-widest">Date & Heure</p>
                    <p className="text-sm font-black text-white capitalize">{formattedDate} @ {time} {courtName && `(${courtName})`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    {paymentMethod === "online" ? (
                      <CreditCard className="h-5 w-5 text-gold" />
                    ) : (
                      <Banknote className="h-5 w-5 text-gold" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground-muted tracking-widest">Paiement</p>
                    <p className="text-sm font-black text-white">
                      {paymentMethod === "online" ? "En ligne — attente club (pas encore automatisé)" : "Sur place au club"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-bold text-foreground-muted uppercase tracking-widest">Total</span>
                <span className="text-3xl font-black text-white">
                  {price} <span className="text-gold">DT</span>
                </span>
              </div>

              {/* No-show Warning */}
              <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4">
                <p className="text-[11px] text-warning font-medium leading-relaxed text-center italic">
                  &quot;En cas de no-show, votre score de confiance sera impacté.&quot;
                </p>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 text-black h-16 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-gold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    {paymentMethod === "online" ? "Réserver en attente de paiement" : "Confirmer ma réservation"}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
