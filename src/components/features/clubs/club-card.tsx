import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Laptop } from "lucide-react";
import { FALLBACK_CLUB, SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    city: string;
    type: "Outdoor" | "Indoor";
    logo_url: string | null;
  };
  distanceKm?: number | null;
  directionsHref?: string;
  locale?: string;
}

export function ClubCard({ club, distanceKm, directionsHref, locale = "fr" }: ClubCardProps) {
  const name = club.name ?? "Club";
  const city = club.city ?? "";
  const type = club.type ?? "Outdoor";
  const logoUrl = club.logo_url ?? null;
  const distanceLabel =
    typeof distanceKm === "number" && Number.isFinite(distanceKm)
      ? `${distanceKm.toFixed(1)} km`
      : null;

  return (
    <Card className="p-0 overflow-hidden hover:shadow-lg transition-all group cursor-pointer border-slate-100">
      <div className="relative aspect-video bg-slate-200 overflow-hidden">
        {logoUrl ? (
          <SafeImage
            src={logoUrl}
            fallbackSrc={FALLBACK_CLUB}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-sky-50 text-sky-200">
            <Laptop className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
            {type}
          </Badge>
          <Badge variant="success" className="bg-emerald-500/90 text-white border-0 backdrop-blur-sm">
            Ouvert
          </Badge>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="h-3 w-3" />
              <span>{city ? `${city}, Tunisie` : "Tunisie"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold text-amber-600">
            <Star className="h-3 w-3 fill-amber-600" />
            <span>4.9</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{distanceLabel ? `Distance: ${distanceLabel}` : "Distance indisponible"}</span>
          {directionsHref ? (
            <Link
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-700 hover:underline"
            >
              Itinéraire
            </Link>
          ) : null}
        </div>

        <Link
          href={`/${locale}/book/${club.id}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
        >
          Réserver un terrain
        </Link>
      </div>
    </Card>
  );
}
