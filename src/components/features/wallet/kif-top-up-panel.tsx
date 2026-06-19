"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestKifTopUpAction } from "@/modules/wallet/actions";
import { formatKifAmount } from "@/domain/rules/kif-wallet";
import type { KifTopUpPackage } from "@/modules/wallet/repository";

type Props = {
  locale: string;
  packages: KifTopUpPackage[];
  labels: {
    title: string;
    subtitle: string;
    buyCta: string;
    buying: string;
    success: string;
    pendingGateway: string;
    error: string;
    bonusLabel: string;
  };
};

export function KifTopUpPanel({ locale, packages, labels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onBuy = (packageId: string) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await requestKifTopUpAction({ locale, packageId });
      if (res.ok) {
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
          return;
        }
        if (res.pendingGateway) {
          setMessage(labels.pendingGateway);
        } else {
          setMessage(`${labels.success} · ${formatKifAmount(res.newBalance)}`);
        }
        router.refresh();
      } else {
        setError(res.error || labels.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-white">{labels.title}</h2>
        <p className="text-xs text-white/60 mt-1">{labels.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {packages.map((pkg) => {
          const label = locale === "en" ? pkg.labelEn : pkg.labelFr;
          const total = pkg.amount + pkg.bonusAmount;
          return (
            <button
              key={pkg.id}
              type="button"
              disabled={pending}
              onClick={() => onBuy(pkg.id)}
              className="rounded-2xl border border-white/15 bg-white/5 p-4 text-left hover:border-gold/50 hover:bg-gold/5 transition-colors disabled:opacity-50 touch-manipulation"
            >
              <p className="text-sm font-bold text-white">{label}</p>
              <p className="text-lg font-black text-gold mt-1">{formatKifAmount(total)}</p>
              {pkg.bonusAmount > 0 ? (
                <p className="text-[10px] text-emerald-300 mt-1">
                  +{formatKifAmount(pkg.bonusAmount)} {labels.bonusLabel}
                </p>
              ) : null}
              <p className="text-[10px] text-white/50 mt-2">{labels.buyCta}</p>
            </button>
          );
        })}
      </div>

      {message ? (
        <p role="status" className="text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-300">{error}</p>
      ) : null}
      {pending ? (
        <p className="text-xs text-white/50">{labels.buying}</p>
      ) : null}
    </div>
  );
}
