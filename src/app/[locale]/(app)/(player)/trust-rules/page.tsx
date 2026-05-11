import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  UserCheck,
  CreditCard
} from "lucide-react";

type TrustRulesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: TrustRulesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Trust Rules" : "Règles de Confiance",
    description: isEn
      ? "Learn about KIFPADEL trust score, no-show penalties, and booking rules."
      : "Découvrez le score de confiance KIFPADEL, les pénalités no-show et les règles de réservation.",
  };
}

export default async function TrustRulesPage({ params }: TrustRulesPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const trustLevels = [
    {
      icon: ShieldCheck,
      label: "Fiable",
      range: "70-100",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      benefits: [
        "Accès complet à toutes les réservations",
        "Option de paiement sur place disponible",
        "Priorité sur les créneaux populaires",
      ],
    },
    {
      icon: AlertTriangle,
      label: "Attention",
      range: "45-69",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      benefits: [
        "Accès aux réservations maintenu",
        "Option de paiement sur place disponible",
        "Avertissement préventif",
      ],
    },
    {
      icon: ShieldAlert,
      label: "Restreint",
      range: "25-44",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      benefits: [
        "Paiement en ligne obligatoire",
        "Limite de réservations simultanées",
        "Pas de paiement sur place",
      ],
    },
    {
      icon: ShieldX,
      label: "Suspendu",
      range: "0-24",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      benefits: [
        "Réservations bloquées",
        "Contactez le support pour débloquer",
        "Période de suspension temporaire",
      ],
    },
  ];

  const penalties = [
    {
      event: "No-show",
      description: "Ne pas se présenter à une réservation confirmée",
      impact: -18,
      icon: XCircle,
    },
    {
      event: "Annulation tardive",
      description: "Annuler moins de 4h avant le créneau",
      impact: -10,
      icon: Clock,
    },
    {
      event: "Mauvais comportement",
      description: "Signalement par le club ou autres joueurs",
      impact: -25,
      icon: AlertTriangle,
    },
  ];

  const bonuses = [
    {
      event: "Bon comportement",
      description: "Match joué sans incident",
      impact: +4,
      icon: CheckCircle2,
    },
  ];

  const verificationSteps = [
    {
      icon: Phone,
      title: "Vérification téléphone",
      description: "Confirmez votre numéro de téléphone tunisien",
    },
    {
      icon: UserCheck,
      title: "Profil complet",
      description: "Remplissez toutes les informations de votre profil",
    },
    {
      icon: CreditCard,
      title: "Moyen de paiement",
      description: "Ajoutez une carte pour les paiements en ligne",
    },
  ];

  return (
    <div className="flex-1 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
        <Link 
          href={`/${locale}/profile`}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)]"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Règles de Confiance</h1>
          <p className="text-xs text-[var(--foreground-muted)]">Score, pénalités et avantages</p>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* Why Trust Matters */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Pourquoi un score de confiance ?
          </h2>
          <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
            En Tunisie, la plupart des clubs préfèrent le paiement sur place. Pour garantir 
            une expérience fiable à tous, KIFPADEL utilise un score de confiance qui 
            récompense les joueurs sérieux et limite les abus.
          </p>
        </section>

        {/* Trust Levels */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Niveaux de confiance
          </h2>
          <div className="space-y-3">
            {trustLevels.map((level) => (
              <div
                key={level.label}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${level.bgColor}`}>
                      <level.icon className={`h-4 w-4 ${level.color}`} />
                    </div>
                    <span className={`font-bold ${level.color}`}>{level.label}</span>
                  </div>
                  <span className="text-xs font-mono text-[var(--foreground-muted)]">
                    {level.range} pts
                  </span>
                </div>
                <ul className="space-y-1">
                  {level.benefits.map((benefit) => (
                    <li key={benefit} className="text-xs text-[var(--foreground-muted)] flex items-center gap-2">
                      <div className={`h-1 w-1 rounded-full ${level.bgColor.replace('/10', '')}`} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Penalties */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Pénalités
          </h2>
          <div className="space-y-2">
            {penalties.map((penalty) => (
              <div
                key={penalty.event}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <penalty.icon className="h-4 w-4 text-red-400" />
                  <div>
                    <p className="text-sm font-bold text-white">{penalty.event}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{penalty.description}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-red-400">{penalty.impact}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Bonuses */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Bonus
          </h2>
          <div className="space-y-2">
            {bonuses.map((bonus) => (
              <div
                key={bonus.event}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <bonus.icon className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-white">{bonus.event}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{bonus.description}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-400">+{bonus.impact}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Verification Steps */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Améliorer votre confiance
          </h2>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
            {verificationSteps.map((step, index) => (
              <div key={step.title} className="p-4 flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)] font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{step.title}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{step.description}</p>
                </div>
                <step.icon className="h-5 w-5 text-[var(--foreground-muted)]" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
