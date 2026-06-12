import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Laptop } from "lucide-react";
import { ClubDirectionsButton } from "@/components/features/clubs/club-directions-button";
import { clubBookPath } from "@/lib/booking-paths";
import { formatClubCourtsSummary } from "@/lib/utils/club-display";

export interface ClubCardProps {
  club: {
    id: string;
    name: string;
    city: string;
    address?: string | null;
    indoor_courts_count?: number;
    outdoor_courts_count?: number;
    type?: string;
    logo_url?: string | null;
  };
  distanceKm?: number | null;
  /** Si défini (ex. origine utilisateur pour la liste « à proximité »), remplace l’URL par défaut */
  directionsHref?: string;
  locale?: string;
  directionsLabel?: string;
}

export function ClubCard({
  club,
  distanceKm,
  locale = "fr",
  directionsLabel = "Itinéraire",
  directionsHref,
}: ClubCardProps) {
  const bookHref = clubBookPath(locale, club.id);
  const courtsText = formatClubCourtsSummary(
    club.indoor_courts_count ?? 0,
    club.outdoor_courts_count ?? 0,
    locale,
  );

  return (
    <Card className="p-0 overflow-hidden hover:shadow-xl hover:shadow-gold/10 transition-all group bg-surface border-gold/10 rounded-[2rem]">
      <div className="relative aspect-video bg-black overflow-hidden">
        {club.logo_url ? (
          <Image
            src={club.logo_url}
            alt={club.name}
            fill
            className="object-cover opacity-80"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black text-gold/30">
            <Laptop className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {club.type && (
            <Badge
              variant="secondary"
              className="bg-black/60 text-white backdrop-blur-md border border-white/10"
            >
              {club.type}
            </Badge>
          )}
          <Badge
            variant="success"
            className="bg-emerald-500/90 text-white border-0 backdrop-blur-sm"
          >
            Ouvert
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 min-w-0">
            <h3 className="font-bold text-white text-lg line-clamp-1">{club.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <MapPin className="h-3.5 w-3.5 text-gold/60 shrink-0" />
              <span>{club.city}, Tunisie</span>
              {distanceKm != null && (
                <span className="text-gold font-bold ml-1">
                  • {distanceKm < 1 ? "< 1" : Math.round(distanceKm)} km
                </span>
              )}
            </div>
            {courtsText ? (
              <p className="text-[11px] text-white/45 font-medium leading-snug">{courtsText}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 bg-gold/10 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gold shrink-0 border border-gold/20">
            <Star className="h-3.5 w-3.5 fill-gold" />
            <span>4.9</span>
          </div>
        </div>

        <Link
          href={bookHref}
          prefetch={false}
          className="flex w-full min-h-[48px] items-center justify-center py-3.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-black rounded-xl text-sm font-bold shadow-lg shadow-gold/10 touch-manipulation select-none"
        >
          Réserver un terrain
        </Link>
      </div>

      <div className="px-5 pb-5 -mt-1">
        <ClubDirectionsButton
          club={{
            name: club.name,
            city: club.city,
            address: club.address ?? undefined,
          }}
          href={directionsHref}
          label={directionsLabel}
          className="w-full min-h-[44px] border-gold/30 bg-black/40 text-white hover:bg-gold/15 hover:border-gold/50 touch-manipulation"
        />
      </div>
    </Card>
  );
}
