"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  XCircle,
  UserX,
  CheckCircle2,
  Shield,
  Phone,
  Calendar,
  ChevronDown,
  Ban,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { reliabilityFromTrustScore, trustImpactFromEvent, decideSanction } from "@/domain/rules/trust";
import { confirmIncidentAction } from "@/modules/clubs/actions";

type Incident = {
  id: string;
  player: {
    id: string;
    name: string;
    trustScore: number;
    phone: string;
  };
  type: "no_show" | "late_cancel" | "bad_behavior";
  date: string;
  bookingTime: string;
  bookingId?: string;
  court: string;
  status: "pending" | "resolved";
  notes: string;
};

type IncidentsManagerProps = {
  incidents: Incident[];
  locale: string;
};

export function IncidentsManager({ incidents, locale }: IncidentsManagerProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");

  const filtered = incidents.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  const pendingCount = incidents.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--warning)]">{pendingCount}</p>
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mt-1">En attente</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--danger)]">
            {incidents.filter((i) => i.type === "no_show").length}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mt-1">No-shows</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--success)]">
            {incidents.filter((i) => i.status === "resolved").length}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mt-1">Résolus</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["pending", "resolved", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === tab
                ? "bg-[var(--gold)] text-black"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-white"
            )}
          >
            {tab === "pending" && "En attente"}
            {tab === "resolved" && "Résolus"}
            {tab === "all" && "Tous"}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {filtered.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} />
        ))}

        {filtered.length === 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-[var(--success)] mx-auto mb-3" />
            <p className="text-white font-medium">Aucun incident</p>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              Tous les incidents ont été traités
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [actionState, setActionState] = useState<"idle" | "success" | "error">("idle");
  const [actionMessage, setActionMessage] = useState("");

  const reliability = reliabilityFromTrustScore(incident.player.trustScore);
  const impact = trustImpactFromEvent(incident.type);
  const newScore = Math.max(0, incident.player.trustScore + impact.delta);
  const sanction = decideSanction(newScore, false);

  const typeIcons = {
    no_show: XCircle,
    late_cancel: Clock,
    bad_behavior: UserX,
  };

  const typeLabels = {
    no_show: "No-show",
    late_cancel: "Annulation tardive",
    bad_behavior: "Mauvais comportement",
  };

  const typeColors = {
    no_show: "text-[var(--danger)] bg-[var(--danger)]/10",
    late_cancel: "text-[var(--warning)] bg-[var(--warning)]/10",
    bad_behavior: "text-[var(--danger)] bg-[var(--danger)]/10",
  };

  const Icon = typeIcons[incident.type];

  const handleConfirmIncident = () => {
    startTransition(async () => {
      const result = await confirmIncidentAction(
        incident.player.id,
        incident.type,
        incident.bookingId
      );
      if (result.ok) {
        setActionState("success");
        setActionMessage(`Trust score mis à jour: ${incident.player.trustScore} → ${newScore}`);
        router.refresh();
      } else {
        setActionState("error");
        setActionMessage(result.error);
      }
    });
  };

  const handleDismissIncident = () => {
    setActionState("success");
    setActionMessage("Incident annulé - pas de pénalité");
    // In production, this would also update the incident status in DB
  };

  return (
    <div className={cn(
      "bg-[var(--surface)] border rounded-2xl overflow-hidden",
      incident.status === "pending" ? "border-[var(--warning)]/30" : "border-[var(--border)]"
    )}>
      {/* Main Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-[var(--surface-elevated)] transition-colors text-left"
      >
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", typeColors[incident.type])}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white truncate">{incident.player.name}</p>
            {incident.status === "pending" && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
                À traiter
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--foreground-muted)]">
            {typeLabels[incident.type]} · {new Date(incident.date).toLocaleDateString("fr-FR")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-white">{incident.player.trustScore}</p>
            <p className="text-[9px] text-[var(--foreground-muted)]">Trust</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-[var(--foreground-muted)] transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-4">
          {/* Incident Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--background)]">
              <Calendar className="h-4 w-4 text-[var(--foreground-muted)]" />
              <div>
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Créneau</p>
                <p className="text-sm font-medium text-white">{incident.bookingTime} · {incident.court}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--background)]">
              <Phone className="h-4 w-4 text-[var(--foreground-muted)]" />
              <div>
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Contact</p>
                <p className="text-sm font-medium text-white">{incident.player.phone}</p>
              </div>
            </div>
          </div>

          {incident.notes && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--background)]">
              <MessageSquare className="h-4 w-4 text-[var(--foreground-muted)] mt-0.5" />
              <div>
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">Notes</p>
                <p className="text-sm text-white mt-1">{incident.notes}</p>
              </div>
            </div>
          )}

          {/* Impact Preview */}
          {incident.status === "pending" && actionState === "idle" && (
            <div className="p-4 rounded-xl bg-[var(--danger)]/5 border border-[var(--danger)]/20 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--danger)]" />
                <p className="text-sm font-bold text-white">Impact si confirmé</p>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--foreground-muted)]">Trust Score:</span>
                <span className="font-mono">
                  <span className="text-white">{incident.player.trustScore}</span>
                  <span className="text-[var(--danger)]"> → {newScore}</span>
                  <span className="text-[var(--danger)]"> ({impact.delta})</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--foreground-muted)]">Sanction:</span>
                <span className={cn(
                  "font-bold uppercase text-xs",
                  sanction.action === "none" && "text-[var(--success)]",
                  sanction.action === "warning" && "text-[var(--warning)]",
                  sanction.action === "temporary_ban" && "text-[var(--danger)]",
                  sanction.action === "blacklist" && "text-[var(--danger)]"
                )}>
                  {sanction.action === "none" && "Aucune"}
                  {sanction.action === "warning" && "Avertissement"}
                  {sanction.action === "temporary_ban" && "Suspension temporaire"}
                  {sanction.action === "blacklist" && "Blacklist"}
                </span>
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
          {incident.status === "pending" && actionState === "idle" && (
            <div className="flex gap-3">
              <button
                onClick={handleConfirmIncident}
                disabled={isPending}
                className="flex-1 h-11 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] font-bold text-sm hover:bg-[var(--danger)]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Confirmer incident
                  </>
                )}
              </button>
              <button
                onClick={handleDismissIncident}
                disabled={isPending}
                className="flex-1 h-11 rounded-xl bg-[var(--surface-elevated)] text-[var(--foreground-muted)] font-bold text-sm hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          )}

          {incident.status === "resolved" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              <p className="text-sm text-[var(--success)] font-medium">Incident traité</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
