import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, ShieldCheck } from "lucide-react";

interface PlayerCardProps {
  player: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    league: "Bronze" | "Silver" | "Gold" | "Platinum";
    trust_rating?: number | null;
    reliability?: string | null;
  };
}

export function PlayerCard({ player }: PlayerCardProps) {
  const trustRatingValue = Number.isFinite(player.trust_rating)
    ? Number(player.trust_rating)
    : 0;
  const reliabilityLabel = player.reliability ?? "healthy";

  return (
    <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
      <Avatar
        src={player.avatar_url}
        alt={player.display_name}
        size="lg"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900 truncate">
            {player.display_name}
          </h3>
          <Badge variant={player.league.toLowerCase() as BadgeProps["variant"]}>
            {player.league}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span>{trustRatingValue.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>{reliabilityLabel}</span>
          </div>
        </div>
      </div>

      <button className="text-xs font-bold text-sky-600 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors">
        Inviter
      </button>
    </Card>
  );
}
