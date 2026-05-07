import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ClubDirectionsButton } from "@/components/features/clubs/club-directions-button";

interface MatchCardProps {
  match: {
    id: string;
    starts_at: string;
    clubName: string;
    clubCity: string;
    clubAddress?: string | null;
    playerCount: number;
    price_per_player: number;
  };
  locale?: string;
}

export function MatchCard({ match, locale = "fr" }: MatchCardProps) {
  const date = match.starts_at ? new Date(match.starts_at) : new Date();
  const isValidDate = !isNaN(date.getTime());

  const formattedDate = isValidDate
    ? date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "À venir";

  const formattedTime = isValidDate
    ? date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const dateParts = formattedDate.split(" ");
  const dateWeekday = dateParts[0] ?? "";
  const dateDay = dateParts[1] ?? "";

  const playerCount = Number.isFinite(match.playerCount) ? match.playerCount : 0;
  const pricePerPlayer = Number.isFinite(match.price_per_player) ? match.price_per_player : 0;
  const slotsLeft = Math.max(0, 4 - playerCount);
  const progress = Math.min(100, Math.max(0, (playerCount / 4) * 100));

  const detailHref = `/${locale}/matches/${match.id}`;

  return (
    <Card className="p-0 overflow-hidden hover:shadow-gold-strong transition-all duration-500 group bg-surface rounded-3xl border-white/5">
      <div className="flex h-full min-h-[140px] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Date/Time Decorative Column */}
        <Link
          href={detailHref}
          className="bg-black/40 p-5 flex flex-col items-center justify-center min-w-[100px] text-white relative overflow-hidden hover:bg-white/5 transition-colors"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--gold)] rounded-full blur-3xl opacity-20 -mr-10 -mt-10" />

          <span className="text-[10px] uppercase font-black tracking-widest text-[var(--gold)]/80 mb-1">
            {dateWeekday}
          </span>
          <span className="text-3xl font-black tracking-tighter leading-none mb-1 text-white">
            {dateDay}
          </span>
          <span className="text-[10px] font-bold text-white/50">{formattedTime}</span>
        </Link>

        {/* Content Column */}
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          <Link href={detailHref} className="block space-y-3 text-left">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-0.5 min-w-0">
                <h3 className="font-bold text-white group-hover:text-[var(--gold)] transition-colors line-clamp-1">
                  {match.clubName ?? "Club"}
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-white/50 font-medium">
                  <MapPin className="h-3 w-3 text-[var(--gold)]/60 shrink-0" />
                  <span className="truncate">
                    {match.clubCity}, Tunisie
                  </span>
                </div>
              </div>
              <Badge
                variant={slotsLeft > 0 ? "success" : "secondary"}
                className={cn(
                  "shrink-0 rounded-lg",
                  slotsLeft > 0
                    ? "bg-[var(--gold)]/20 text-[var(--gold)] border-0"
                    : "bg-white/10 text-white/50 border-0",
                )}
              >
                {slotsLeft > 0 ? `${slotsLeft} dispos` : "Complet"}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-white/50">Remplissage</span>
                <span className="text-[var(--gold)]">{playerCount} / 4</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 shadow-sm shadow-[var(--gold)]/20",
                    progress === 100
                      ? "bg-white/30 w-full"
                      : progress === 75
                        ? "bg-[var(--gold)] w-3/4"
                        : progress === 50
                          ? "bg-[var(--gold)] w-1/2"
                          : progress === 25
                            ? "bg-[var(--gold)] w-1/4"
                            : "bg-[var(--gold)] w-0",
                  )}
                />
              </div>
            </div>
          </Link>

          <div className="pt-3 flex justify-between items-center border-t border-white/5 gap-2">
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-lg font-black text-white">{pricePerPlayer}</span>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                DT / pers
              </span>
            </div>
            <Link
              href={detailHref}
              className="h-8 w-8 shrink-0 rounded-full bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)] group-hover:bg-[var(--gold)] group-hover:text-black transition-all"
              aria-label="Voir le match"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 p-3 bg-black/20">
        <ClubDirectionsButton
          club={{
            name: match.clubName,
            city: match.clubCity,
            address: match.clubAddress ?? undefined,
          }}
          label="Itinéraire"
          className="w-full border-white/15 bg-transparent text-white py-2.5 text-xs hover:bg-white/10"
        />
      </div>
    </Card>
  );
}
