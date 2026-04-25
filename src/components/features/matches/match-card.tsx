import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, ChevronRight } from "lucide-react";


import { cn } from "@/lib/utils/cn";

interface MatchCardProps {
  match: {
    id: string;
    starts_at: string;
    clubName: string;
    playerCount: number;
    price_per_player: number;
  };
}

export function MatchCard({ match }: MatchCardProps) {
  const date = new Date(match.starts_at);
  const formattedDate = date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const formattedTime = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const slotsLeft = 4 - match.playerCount;
  const progress = (match.playerCount / 4) * 100;

  return (
    <Card className="p-0 overflow-hidden hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 cursor-pointer group border-slate-100/50 rounded-[2rem]">
      <div className="flex h-full min-h-[140px]">
        {/* Date/Time Decorative Column */}
        <div className="bg-slate-900 p-5 flex flex-col items-center justify-center min-w-[100px] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10" />
          
          <span className="text-[10px] uppercase font-black tracking-widest text-sky-400/80 mb-1">
            {formattedDate.split(" ")[0]}
          </span>
          <span className="text-3xl font-black tracking-tighter leading-none mb-1">
            {formattedDate.split(" ")[1]}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {formattedTime}
          </span>
        </div>

        {/* Content Column */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                  {match.clubName}
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <MapPin className="h-3 w-3" />
                  <span>Tunis, Tunisie</span>
                </div>
              </div>
              <Badge variant={slotsLeft > 0 ? "success" : "secondary"} className="shrink-0 rounded-lg">
                {slotsLeft > 0 ? `${slotsLeft} dispos` : "Complet"}
              </Badge>
            </div>

            {/* Occupancy Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-500">Remplissage</span>
                <span className="text-slate-900">{match.playerCount} / 4</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 shadow-sm shadow-sky-200",
                    progress === 100 ? "bg-slate-400 w-full" : 
                    progress === 75 ? "bg-sky-500 w-3/4" :
                    progress === 50 ? "bg-sky-500 w-1/2" :
                    progress === 25 ? "bg-sky-500 w-1/4" : "bg-sky-500 w-0"
                  )}
                />

              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-between items-center border-t border-slate-50">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">{match.price_per_player}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DT / pers</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sky-600 group-hover:text-white transition-all">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
