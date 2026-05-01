import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import {
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

type ClubDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ClubDashboardPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Club Dashboard" : "Tableau de bord Club",
    description: "Manage your padel club bookings, players, and incidents.",
  };
}

export default async function ClubDashboardPage({ params }: ClubDashboardPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  // Mock data - would come from database
  const stats = {
    todayBookings: 12,
    weekRevenue: 2450,
    activeMembers: 156,
    pendingIncidents: 3,
  };

  const todaySlots = [
    { time: "09:00", court: "Court 1", player: "Ahmed B.", status: "confirmed", paymentMethod: "online" },
    { time: "10:30", court: "Court 2", player: "Sarah M.", status: "confirmed", paymentMethod: "on_site" },
    { time: "11:00", court: "Court 1", player: "Mehdi K.", status: "pending", paymentMethod: "on_site" },
    { time: "14:00", court: "Court 3", player: "Youssef T.", status: "confirmed", paymentMethod: "online" },
    { time: "16:00", court: "Court 1", player: "Ines L.", status: "pending", paymentMethod: "on_site" },
  ];

  const recentIncidents = [
    { player: "Karim Z.", type: "no_show", date: "Hier", trustScore: 42 },
    { player: "Omar F.", type: "late_cancel", date: "Il y a 2 jours", trustScore: 58 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{dictionary.club.dashboardTitle}</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 2xl:grid-cols-4">
        <StatCard
          label="Réservations aujourd'hui"
          value={stats.todayBookings}
          icon={Calendar}
          trend="+3"
          trendUp
        />
        <StatCard
          label="Revenus semaine"
          value={`${stats.weekRevenue} DT`}
          icon={TrendingUp}
          trend="+12%"
          trendUp
        />
        <StatCard
          label="Membres actifs"
          value={stats.activeMembers}
          icon={Users}
        />
        <StatCard
          label="Incidents en attente"
          value={stats.pendingIncidents}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Today's Bookings */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-[var(--gold)]" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Réservations du jour</h2>
                <p className="text-[10px] text-[var(--foreground-muted)]">
                  {todaySlots.length} créneaux réservés
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/club/slots`}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {todaySlots.map((slot, i) => (
              <div key={i} className="p-4 flex items-center gap-4 hover:bg-[var(--surface-elevated)] transition-colors">
                <div className="text-center min-w-[50px]">
                  <p className="text-lg font-bold text-white">{slot.time.split(":")[0]}</p>
                  <p className="text-[10px] text-[var(--foreground-muted)]">:{slot.time.split(":")[1]}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{slot.player}</p>
                  <p className="text-[11px] text-[var(--foreground-muted)]">{slot.court}</p>
                </div>
                <div className="flex items-center gap-2">
                  {slot.paymentMethod === "online" ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
                      Payé
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
                      Sur place
                    </span>
                  )}
                  {slot.status === "confirmed" ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <Clock className="h-4 w-4 text-[var(--warning)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Incidents & Trust Alerts */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Incidents récents</h2>
                <p className="text-[10px] text-[var(--foreground-muted)]">
                  {recentIncidents.length} à traiter
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/club/incidents`}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:underline"
            >
              Gérer
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentIncidents.map((incident, i) => (
              <div key={i} className="p-4 flex items-center gap-4 hover:bg-[var(--surface-elevated)] transition-colors">
                <div className="h-10 w-10 rounded-full bg-[var(--danger)]/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-[var(--danger)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{incident.player}</p>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    {incident.type === "no_show" ? "No-show" : "Annulation tardive"} · {incident.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--danger)]">{incident.trustScore}</p>
                  <p className="text-[9px] text-[var(--foreground-muted)]">Trust</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
              </div>
            ))}
          </div>
          
          {/* Quick Actions */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
            <Link
              href={`/${locale}/club/incidents`}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] text-sm font-bold hover:bg-[var(--warning)]/20 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Signaler un incident
            </Link>
          </div>
        </section>
      </div>

      {/* Payment Methods Summary */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-[var(--gold)]" />
          </div>
          <div>
            <h2 className="font-bold text-white">Méthodes de paiement</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">Répartition cette semaine</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
            <p className="text-2xl font-bold text-[var(--success)]">68%</p>
            <p className="text-sm text-[var(--foreground-muted)]">Paiement en ligne</p>
            <p className="text-[10px] text-[var(--success)] mt-1">+15% vs semaine dernière</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/20">
            <p className="text-2xl font-bold text-[var(--warning)]">32%</p>
            <p className="text-sm text-[var(--foreground-muted)]">Paiement sur place</p>
            <p className="text-[10px] text-[var(--foreground-muted)] mt-1">Joueurs de confiance uniquement</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "warning";
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-4 space-y-3 min-w-0">
      <div className="flex items-center justify-between">
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            variant === "warning" ? "bg-[var(--warning)]/10" : "bg-[var(--gold)]/10"
          }`}
        >
          <Icon className={`h-4 w-4 ${variant === "warning" ? "text-[var(--warning)]" : "text-[var(--gold)]"}`} />
        </div>
        {trend && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              trendUp ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`text-xl sm:text-2xl font-bold leading-tight break-words ${variant === "warning" ? "text-[var(--warning)]" : "text-white"}`}
        >
          {value}
        </p>
        <p className="mt-1 text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider leading-tight">
          {label}
        </p>
      </div>
    </div>
  );
}
