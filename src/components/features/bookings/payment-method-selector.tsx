"use client";

import Link from "next/link";
import { Coins, Banknote, ShieldAlert } from "lucide-react";
import { formatKifAmount } from "@/domain/rules/kif-wallet";

export type PlayerPaymentMethod = "wallet" | "on_site";

interface PaymentMethodSelectorProps {
  selected: PlayerPaymentMethod | null;
  onSelect: (method: PlayerPaymentMethod) => void;
  isRestricted: boolean;
  price: number;
  priceLabel?: string;
  walletBalance?: number;
  walletHref?: string;
  locale?: string;
}

export function PaymentMethodSelector({
  selected,
  onSelect,
  isRestricted,
  price,
  priceLabel = "Total",
  walletBalance = 0,
  walletHref,
  locale = "fr",
}: PaymentMethodSelectorProps) {
  const balance = Number.isFinite(walletBalance) ? walletBalance : 0;
  const insufficient = price > 0 && balance < price;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider">
          {locale === "en" ? "Payment" : "Mode de paiement"}
        </span>
        {isRestricted && (
          <div className="flex items-center gap-1 text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            <span className="text-[10px] font-medium">
              {locale === "en" ? "KIF tokens required" : "Jetons KIF requis"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSelect("wallet")}
          className={`relative min-h-[80px] p-4 rounded-xl border-2 transition-all touch-manipulation cursor-pointer ${
            selected === "wallet"
              ? "border-[var(--gold)] bg-[var(--gold)]/10"
              : insufficient
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--foreground-muted)]"
          }`}
        >
          <div className="flex flex-col items-center gap-1.5">
            <Coins
              className={`h-5 w-5 ${
                selected === "wallet" ? "text-[var(--gold)]" : "text-[var(--foreground-muted)]"
              }`}
            />
            <span
              className={`text-xs font-bold ${
                selected === "wallet" ? "text-[var(--gold)]" : "text-white"
              }`}
            >
              {locale === "en" ? "KIF tokens" : "Jetons KIF"}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {priceLabel} · {price} DT
            </span>
            <span className="text-[10px] font-bold text-white/80">
              Solde : {formatKifAmount(balance)}
            </span>
            {insufficient && walletHref ? (
              <Link
                href={walletHref}
                className="text-[10px] font-bold text-amber-300 underline"
                onClick={(e) => e.stopPropagation()}
              >
                {locale === "en" ? "Top up" : "Recharger"}
              </Link>
            ) : null}
          </div>
          {selected === "wallet" && (
            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--gold)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => !isRestricted && onSelect("on_site")}
          disabled={isRestricted}
          className={`relative min-h-[80px] p-4 rounded-xl border-2 transition-all touch-manipulation cursor-pointer ${
            isRestricted
              ? "border-[var(--border)] bg-[var(--background)] opacity-50 cursor-not-allowed"
              : selected === "on_site"
                ? "border-[var(--gold)] bg-[var(--gold)]/10"
                : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--foreground-muted)]"
          }`}
        >
          <div className="flex flex-col items-center gap-1.5">
            <Banknote
              className={`h-5 w-5 ${
                selected === "on_site" && !isRestricted
                  ? "text-[var(--gold)]"
                  : "text-[var(--foreground-muted)]"
              }`}
            />
            <span
              className={`text-xs font-bold ${
                selected === "on_site" && !isRestricted
                  ? "text-[var(--gold)]"
                  : isRestricted
                    ? "text-[var(--foreground-muted)]"
                    : "text-white"
              }`}
            >
              {locale === "en" ? "Pay at club" : "Payer sur place"}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {priceLabel} · {price} DT {locale === "en" ? "at club" : "au club"}
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
