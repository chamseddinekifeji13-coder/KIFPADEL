import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

interface MatchCardProps {
  match: {
    id: string;
    starts_at: string;
    clubName: string;
    playerCount: number;
    price_per_player: number;
  };
  locale?: string;
}

export function MatchCard({ match, locale = "fr" }: MatchCardProps) {
  const date = match.starts_at ? new Date(match.starts_at) : new Date();
  const isValidDate = !isNaN(date.getTime());
  
  const formattedDate = isValidDate ? date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) : "Jeu. 01 Jan.";
  
  const formattedTime = isValidDate ? date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }) : "--:--";

  const slotsLeft = 4 - match.playerCount;
  const progress = (match.playerCount / 4) * 100;

  return (
    <Link href={`/${locale}/matches/${match.id}`} className="block">
      <Card className="p-0 overflow-hidden hover:shadow-2xl hover:shadow-gold/20 transition-all duration-300 cursor-pointer group bg-surface border-gold/10 rounded-[2rem] hover:-translate-y-1">
      <div className="flex h-full min-h-[140px] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Date/Time Decorative Column */}
        <div className="bg-black p-5 flex flex-col items-center justify-center min-w-[100px] text-white relative overflow-hidden border-r border-gold/10">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gold rounded-full blur-3xl opacity-20 -mr-10 -mt-10" />
          
          <span className="text-[10px] uppercase font-black tracking-widest text-gold/80 mb-1">
            {formattedDate.split(" ")[0]}
          </span>
          <span className="text-3xl font-black tracking-tighter leading-none mb-1 text-white">
            {formattedDate.split(" ")[1]}
          </span>
          <span className="text-[10px] font-bold text-white/50">
            {formattedTime}
          </span>
        </div>

        {/* Content Column */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-0.5">
                <h3 className="font-bold text-white group-hover:text-gold transition-colors line-clamp-1">
                  {match.clubName}
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-white/50 font-medium">
                  <MapPin className="h-3 w-3 text-gold/60" />
                  <span>Tunis, Tunisie</span>
                </div>
              </div>
              <Badge variant={slotsLeft > 0 ? "success" : "secondary"} className={cn("shrink-0 rounded-lg", slotsLeft > 0 ? "bg-gold/20 text-gold border-0" : "bg-white/10 text-white/50 border-0")}>
                {slotsLeft > 0 ? `${slotsLeft} dispos` : "Complet"}
              </Badge>
            </div>

            {/* Occupancy Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-white/50">Remplissage</span>
                <span className="text-gold">{match.playerCount} / 4</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 shadow-sm shadow-gold/20",
                    progress === 100 ? "bg-white/30 w-full" : 
                    progress === 75 ? "bg-gold w-3/4" :
                    progress === 50 ? "bg-gold w-1/2" :
                    progress === 25 ? "bg-gold w-1/4" : "bg-gold w-0"
                  )}
                />

              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-between items-center border-t border-white/5">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white">{match.price_per_player}</span>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">DT / pers</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black transition-all">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </Card>
    </Link>
  );
}
