import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, ShieldCheck } from "lucide-react";
import { InvitePlayerButton } from "@/components/features/players/player-invite-button";
import { playerCategoryBadgeVariant } from "@/domain/rules/player-category";

interface PlayerCardProps {
  locale: string;
  player: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    league: string;
    leagueCategory?: string;
    sport_rating: number;
    trust_score: number;
    gender?: "male" | "female" | null;
    reliability: string;
  };
}

export function PlayerCard({ locale, player }: PlayerCardProps) {
  return (
    <Card className="p-4 flex items-center gap-4 border-white/5 bg-surface-elevated hover:shadow-gold-strong transition-all duration-500 touch-manipulation">
      <Avatar
        src={player.avatar_url}
        alt={player.display_name}
        size="lg"
        className="ring-2 ring-gold/20"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-white truncate tracking-tight">
            {player.display_name || "Joueur"}
          </h3>
          <Badge
            variant={
              playerCategoryBadgeVariant(player.leagueCategory ?? player.league) as BadgeProps["variant"]
            }
          >
            {player.league || "P25"}
          </Badge>
          <Badge variant="success" className="text-[9px] px-1.5 py-0">
            Vérifié
          </Badge>
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-foreground-muted tracking-widest">
            <Star className="h-3 w-3 text-gold fill-gold" />
            <span>
              ELO {Math.round(player.sport_rating)} · Trust {player.trust_score}/100
              {player.gender ? ` · ${player.gender === "male" ? "H" : "F"}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-500 tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            <span>{player.reliability || "Stable"}</span>
          </div>
        </div>
      </div>

      <InvitePlayerButton
        locale={locale}
        playerId={player.id}
        playerDisplayName={player.display_name || "Joueur"}
      />
    </Card>
  );
}
