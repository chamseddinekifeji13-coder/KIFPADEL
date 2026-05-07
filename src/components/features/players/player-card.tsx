import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, ShieldCheck } from "lucide-react";

interface PlayerCardProps {
  player: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    league: "Bronze" | "Silver" | "Gold" | "Platinum";
    trust_score: number;
    reliability: string;
  };
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <Card className="p-4 flex items-center gap-4 hover:border-gold/30 hover:shadow-gold transition-all cursor-pointer">
      <Avatar
        src={player.avatar_url}
        alt={player.display_name}
        size="lg"
        className="ring-2 ring-gold/20"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-white truncate uppercase tracking-tight">
            {player.display_name || "Joueur"}
          </h3>
          <Badge variant={(player.league || "Bronze").toLowerCase() as BadgeProps["variant"]}>
            {player.league || "Bronze"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-foreground-muted tracking-widest">
            <Star className="h-3 w-3 text-gold fill-gold" />
            <span>{(player.trust_score || 0).toFixed(1)} Trust</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-500 tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            <span>{player.reliability || "Stable"}</span>
          </div>
        </div>
      </div>

      <button className="text-[10px] font-black uppercase tracking-widest text-black px-4 py-2 rounded-xl bg-gold hover:bg-gold-light active:scale-95 transition-all shadow-gold">
        Inviter
      </button>
    </Card>
  );
}
