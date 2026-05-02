"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Shield,
  ChevronDown,
  Filter,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { reliabilityFromTrustScore } from "@/domain/rules/trust";
import { confirmArrivalAction, reportNoShowAction } from "@/modules/clubs/actions";

type Booking = {
  id: string;
  time: string;
  endTime: string;
  court: string;
  player: {
    id: string;
    name: string;
    trustScore: number;
    phone: string;
  };
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show";
  paymentMethod: "online" | "on_site";
  amount: number;
};

type SlotsManagerProps = {
  bookings: Booking[];
  courts: string[];
  locale: string;
};

export function SlotsManager({ bookings, courts, locale }: SlotsManagerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCourt, setFilterCourt] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredBookings = bookings.filter((b) => {
    if (filterCourt && b.court !== filterCourt) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" });
          const dayNum = date.getDate();

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "flex flex-col items-center px-4 py-3 rounded-xl transition-all min-w-[60px]",
                isSelected
                  ? "bg-[var(--gold)] text-black"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--gold)]/30"
              )}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">{dayName}</span>
              <span className="text-xl font-bold">{dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium">Filtres:</span>
        </div>
        
        <select
          value={filterCourt ?? ""}
          onChange={(e) => setFilterCourt(e.target.value || null)}
          className="h-8 px-3 pr-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-white text-xs font-medium appearance-none cursor-pointer"
        >
          <option value="">Tous les courts</option>
          {courts.map((court) => (
            <option key={court} value={court}>{court}</option>
          ))}
        </select>

        <select
          value={filterStatus ?? ""}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="h-8 px-3 pr-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-white text-xs font-medium appearance-none cursor-pointer"
        >
          <option value="">Tous les statuts</option>
          <option value="confirmed">Confirmées</option>
          <option value="pending">En attente</option>
        </select>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}

        {filteredBookings.length === 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <Calendar className="h-8 w-8 text-[var(--foreground-muted)] mx-auto mb-3" />
            <p className="text-white font-medium">Aucune réservation</p>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              Pas de créneaux réservés pour cette période
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [actionState, setActionState] = useState<"idle" | "success" | "error">("idle");
  const [actionMessage, setActionMessage] = useState("");

  const reliability = reliabilityFromTrustScore(booking.player.trustScore);

  const trustColors: Record<string, string> = {
    healthy: "text-[var(--success)] bg-[var(--success)]/10",
    warning: "text-[var(--warning)] bg-[var(--warning)]/10",
    restricted: "text-[var(--danger)] bg-[var(--danger)]/10",
    blacklisted: "text-[var(--danger)] bg-[var(--danger)]/10",
  };

  const trustLabels: Record<string, string> = {
    healthy: "Fiable",
    warning: "Attention",
    restricted: "Restreint",
    blacklisted: "Blacklisté",
  };

  const handleConfirmArrival = () => {
    startTransition(async () => {
      const result = await confirmArrivalAction(booking.id);
      if (result.ok) {
        setActionState("success");
        setActionMessage("Arrivée confirmée");
        router.refresh();
      } else {
        setActionState("error");
        setActionMessage(result.error);
      }
    });
  };

  const handleReportNoShow = () => {
    startTransition(async () => {
      const result = await reportNoShowAction(booking.id, booking.player.id);
      if (result.ok) {
        setActionState("success");
        setActionMessage("No-show enregistré - Trust impacté");
        router.refresh();
      } else {
        setActionState("error");
        setActionMessage(result.error);
      }
    });
  };

  const isActionable = booking.status === "confirmed" || booking.status === "pending";

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Main Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-[var(--surface-elevated)] transition-colors text-left"
      >
        {/* Time Block */}
        <div className="text-center min-w-[60px] p-2 rounded-xl bg-[var(--background)]">
          <p className="text-lg font-bold text-white">{booking.time}</p>
          <p className="text-[10px] text-[var(--foreground-muted)]">{booking.endTime}</p>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white truncate">{booking.player.name}</p>
            <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full", trustColors[reliability])}>
              {trustLabels[reliability]}
            </span>
          </div>
          <p className="text-sm text-[var(--foreground-muted)]">{booking.court}</p>
        </div>

        {/* Payment & Status */}
        <div className="flex items-center gap-3">
          {booking.paymentMethod === "online" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
              Payé
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
              {booking.amount} DT
            </span>
          )}
          {booking.status === "completed" ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
          ) : booking.status === "no_show" ? (
            <XCircle className="h-5 w-5 text-[var(--danger)]" />
          ) : (
            <Clock className="h-5 w-5 text-[var(--warning)]" />
          )}
          <ChevronDown className={cn("h-4 w-4 text-[var(--foreground-muted)] transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-4">
          {/* Player Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--background)]">
              <Phone className="h-4 w-4 text-[var(--foreground-muted)]" />
              <div>
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Téléphone</p>
                <p className="text-sm font-medium text-white">{booking.player.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--background)]">
              <Shield className="h-4 w-4 text-[var(--foreground-muted)]" />
              <div>
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Score Trust</p>
                <p className={cn("text-sm font-bold", trustColors[reliability].split(" ")[0])}>
                  {booking.player.trustScore}/100
                </p>
              </div>
            </div>
          </div>

          {/* Trust Warning */}
          {reliability !== "healthy" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/20">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)] mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--warning)]">Joueur à surveiller</p>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  {reliability === "warning" && "Ce joueur a eu des incidents passés. Vérifiez sa présence."}
                  {reliability === "restricted" && "Ce joueur est en période probatoire. Paiement sur place non recommandé."}
                </p>
              </div>
            </div>
          )}

          {/* Action Feedback */}
          {actionState !== "idle" && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl border",
              actionState === "success" 
                ? "bg-[var(--success)]/5 border-[var(--success)]/20 text-[var(--success)]"
                : "bg-[var(--danger)]/5 border-[var(--danger)]/20 text-[var(--danger)]"
            )}>
              {actionState === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <p className="text-sm font-medium">{actionMessage}</p>
            </div>
          )}

          {/* Actions */}
          {isActionable && actionState === "idle" && (
            <div className="flex gap-3">
              <button
                onClick={handleConfirmArrival}
                disabled={isPending}
                className="flex-1 h-11 rounded-xl bg-[var(--success)]/10 text-[var(--success)] font-bold text-sm hover:bg-[var(--success)]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmer arrivée
                  </>
                )}
              </button>
              <button
                onClick={handleReportNoShow}
                disabled={isPending}
                className="flex-1 h-11 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] font-bold text-sm hover:bg-[var(--danger)]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    No-show
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
