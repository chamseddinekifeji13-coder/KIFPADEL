"use client";

import { Banknote, ShieldAlert } from "lucide-react";

interface PaymentMethodSelectorProps {
  selected: "online" | "on_site" | null;
  onSelect: (method: "online" | "on_site") => void;
  isRestricted: boolean;
  price: number;
}

export function PaymentMethodSelector({
  selected,
  onSelect,
  isRestricted,
  price,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider">
          Mode de paiement
        </span>
        {isRestricted && (
          <div className="flex items-center gap-1 text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            <span className="text-[10px] font-medium">Réservation directe indisponible</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => !isRestricted && onSelect("on_site")}
          disabled={isRestricted}
          className={`relative p-4 rounded-xl border-2 transition-all ${
            isRestricted
              ? "border-[var(--border)] bg-[var(--background)] opacity-50 cursor-not-allowed"
              : selected === "on_site"
              ? "border-[var(--gold)] bg-[var(--gold)]/10"
              : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--foreground-muted)]"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Banknote className={`h-5 w-5 ${selected === "on_site" && !isRestricted ? "text-[var(--gold)]" : "text-[var(--foreground-muted)]"}`} />
            <span className={`text-xs font-bold ${selected === "on_site" && !isRestricted ? "text-[var(--gold)]" : isRestricted ? "text-[var(--foreground-muted)]" : "text-white"}`}>
              Payer sur place
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {price} DT au club
            </span>
          </div>
          {selected === "on_site" && !isRestricted && (
            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--gold)]" />
          )}
        </button>
      </div>
    </div>
  );
}
