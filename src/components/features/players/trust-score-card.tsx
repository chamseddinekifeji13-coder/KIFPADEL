"use client";

import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface TrustScoreCardProps {
  trustScore: number;
  reliabilityStatus: string;
  locale: string;
}

export function TrustScoreCard({
  trustScore,
  reliabilityStatus,
  locale,
}: TrustScoreCardProps) {
  const statusConfig: Record<string, {
    icon: typeof ShieldCheck;
    color: string;
    bgColor: string;
    label: string;
    description: string;
  }> = {
    healthy: {
      icon: ShieldCheck,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      label: "Fiable",
      description: "Excellent historique. Accès complet aux réservations.",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      label: "Attention",
      description: "Quelques incidents signalés. Améliorez votre score.",
    },
    restricted: {
      icon: ShieldAlert,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      label: "Restreint",
      description: "Paiement en ligne obligatoire pour réserver.",
    },
    blacklisted: {
      icon: ShieldX,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      label: "Suspendu",
      description: "Compte temporairement suspendu. Contactez le support.",
    },
  };

  const config = statusConfig[reliabilityStatus.toLowerCase()] ?? statusConfig.healthy;
  const Icon = config.icon;

  // Calculate progress percentage (0-100 scale)
  const progressPercent = Math.max(0, Math.min(100, trustScore));

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Score de Confiance</h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Basé sur votre historique
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full ${config.bgColor}`}>
          <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-black text-white">{trustScore}</span>
          <span className="text-xs text-[var(--foreground-muted)]">/ 100</span>
        </div>
        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              trustScore >= 70
                ? "bg-emerald-500"
                : trustScore >= 45
                ? "bg-amber-500"
                : trustScore >= 25
                ? "bg-orange-500"
                : "bg-red-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">
          <span>Suspendu</span>
          <span>Restreint</span>
          <span>Attention</span>
          <span>Fiable</span>
        </div>
      </div>

      {/* Status Description */}
      <div className="flex items-start gap-3 p-3 bg-[var(--background)] rounded-xl">
        <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* Trust Rules Link */}
      <Link
        href={`/${locale}/trust-rules`}
        className="block text-center text-xs text-[var(--gold)] hover:underline font-medium"
      >
        Voir les règles de confiance et anti no-show
      </Link>
    </div>
  );
}
