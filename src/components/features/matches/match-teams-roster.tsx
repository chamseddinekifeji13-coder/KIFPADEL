import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import type { MatchParticipantProfile } from "@/modules/matches/participant-profiles";

const SLOTS_PER_TEAM = 2;

type Props = {
  locale: string;
  participants: MatchParticipantProfile[];
  viewerId?: string | null;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function TeamColumn({
  team,
  label,
  players,
  viewerId,
  emptyLabel,
  isEn,
}: {
  team: "A" | "B";
  label: string;
  players: MatchParticipantProfile[];
  viewerId?: string | null;
  emptyLabel: string;
  isEn: boolean;
}) {
  const slots = Array.from({ length: SLOTS_PER_TEAM }, (_, index) => players[index] ?? null);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-white">{label}</p>
        <span className="text-[10px] font-bold text-[var(--foreground-muted)]">
          {players.length} / {SLOTS_PER_TEAM}
        </span>
      </div>
      <div className="space-y-2">
        {slots.map((player, index) => {
          const isViewer = Boolean(player && viewerId && player.playerId === viewerId);
          return (
            <div
              key={`${team}-${index}`}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-2 min-h-[44px]",
                player
                  ? isViewer
                    ? "border-[var(--gold)]/50 bg-[var(--gold)]/5"
                    : "border-[var(--border)] bg-[var(--surface)]"
                  : "border-dashed border-[var(--border)] bg-transparent",
              )}
            >
              {player ? (
                <>
                  <Avatar
                    src={player.avatarUrl}
                    alt={player.displayName}
                    fallback={initials(player.displayName)}
                    size="sm"
                    className="border-[var(--border)] bg-[var(--surface-elevated)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-xs font-bold truncate",
                        isViewer ? "text-[var(--gold)]" : "text-white",
                      )}
                    >
                      {player.displayName}
                      {isViewer ? (isEn ? " · you" : " · vous") : ""}
                    </p>
                    {player.participationPhase === "pending" ? (
                      <p className="text-[9px] font-bold uppercase text-amber-300/90">
                        {isEn ? "Awaiting confirmation" : "En attente"}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--foreground-muted)] italic px-1">{emptyLabel}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MatchTeamsRoster({ locale, participants, viewerId, className }: Props) {
  const isEn = locale === "en";
  const teamA = participants.filter((p) => p.team === "A");
  const teamB = participants.filter((p) => p.team === "B");

  return (
    <section className={cn("rounded-2xl border border-white/10 p-4 space-y-3 bg-surface-elevated", className)}>
      <h2 className="text-sm font-bold text-white">
        {isEn ? "Teams & players" : "Équipes & joueurs"}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TeamColumn
          team="A"
          label={isEn ? "Team A" : "Équipe A"}
          players={teamA}
          viewerId={viewerId}
          emptyLabel={isEn ? "Open slot" : "Place libre"}
          isEn={isEn}
        />
        <TeamColumn
          team="B"
          label={isEn ? "Team B" : "Équipe B"}
          players={teamB}
          viewerId={viewerId}
          emptyLabel={isEn ? "Open slot" : "Place libre"}
          isEn={isEn}
        />
      </div>
    </section>
  );
}
