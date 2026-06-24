"use client";

import Link from "next/link";
import { Coins, Banknote, ShieldAlert } from "lucide-react";
import { formatKifAmount } from "@/domain/rules/kif-wallet";
import { cn } from "@/lib/utils/cn";

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
  const isEn = locale === "en";
  const balance = Number.isFinite(walletBalance) ? walletBalance : 0;
  const insufficient = price > 0 && balance < price;
  const walletDisabled = insufficient;
  const walletSelected = selected === "wallet" && !walletDisabled;

  const handleWalletClick = () => {
    if (walletDisabled) return;
    onSelect("wallet");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider">
          {isEn ? "Payment" : "Mode de paiement"}
        </span>
        {isRestricted && (
          <div className="flex items-center gap-1 text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            <span className="text-[10px] font-medium">
              {isEn ? "KIF tokens required" : "Jetons KIF requis"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleWalletClick}
          disabled={walletDisabled}
          aria-pressed={walletSelected}
          className={cn(
            "tap-target relative min-h-[88px] p-4 rounded-xl border-2 transition-all duration-100 touch-manipulation text-left",
            walletSelected
              ? "border-[var(--gold)] bg-[var(--gold)]/10"
              : walletDisabled
                ? "border-amber-500/35 bg-amber-500/5 opacity-80 cursor-not-allowed"
                : "border-[var(--border)] bg-[var(--background)] [@media(hover:hover)]:hover:border-[var(--foreground-muted)] active:border-[var(--gold)]/50 active:scale-[0.98] cursor-pointer",
          )}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Coins
              className={cn(
                "h-5 w-5",
                walletSelected ? "text-[var(--gold)]" : "text-[var(--foreground-muted)]",
              )}
            />
            <span
              className={cn(
                "text-xs font-bold",
                walletSelected ? "text-[var(--gold)]" : "text-white",
              )}
            >
              {isEn ? "KIF tokens" : "Jetons KIF"}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {priceLabel} · {price} DT
            </span>
            <span
              className={cn(
                "text-[10px] font-bold",
                insufficient ? "text-amber-300" : "text-white/80",
              )}
            >
              {isEn ? "Balance" : "Solde"} : {formatKifAmount(balance)}
            </span>
            {insufficient ? (
              <span className="text-[10px] font-bold text-amber-300">
                {isEn ? "Insufficient balance" : "Solde insuffisant"}
              </span>
            ) : null}
            {insufficient && walletHref ? (
              <Link
                href={walletHref}
                className="text-[10px] font-bold text-[var(--gold)] underline"
                onClick={(e) => e.stopPropagation()}
              >
                {isEn ? "Top up" : "Recharger"}
              </Link>
            ) : null}
          </div>
          {walletSelected ? (
            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--gold)]" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => !isRestricted && onSelect("on_site")}
          disabled={isRestricted}
          aria-pressed={selected === "on_site" && !isRestricted}
          className={cn(
            "tap-target relative min-h-[88px] p-4 rounded-xl border-2 transition-all duration-100 touch-manipulation text-left",
            isRestricted
              ? "border-[var(--border)] bg-[var(--background)] opacity-50 cursor-not-allowed"
              : selected === "on_site"
                ? "border-[var(--gold)] bg-[var(--gold)]/10 cursor-pointer"
                : "border-[var(--border)] bg-[var(--background)] [@media(hover:hover)]:hover:border-[var(--foreground-muted)] active:border-[var(--gold)]/50 active:scale-[0.98] cursor-pointer",
          )}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Banknote
              className={cn(
                "h-5 w-5",
                selected === "on_site" && !isRestricted
                  ? "text-[var(--gold)]"
                  : "text-[var(--foreground-muted)]",
              )}
            />
            <span
              className={cn(
                "text-xs font-bold",
                selected === "on_site" && !isRestricted
                  ? "text-[var(--gold)]"
                  : isRestricted
                    ? "text-[var(--foreground-muted)]"
                    : "text-white",
              )}
            >
              {isEn ? "Pay at club" : "Payer sur place"}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {priceLabel} · {price} DT
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {isEn ? "At the club desk" : "Au comptoir du club"}
            </span>
          </div>
          {selected === "on_site" && !isRestricted ? (
            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--gold)]" />
          ) : null}
        </button>
      </div>
    </div>
  );
}
