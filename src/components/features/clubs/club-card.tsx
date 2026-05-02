import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Laptop } from "lucide-react";

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    city: string;
    type?: string;
    logo_url?: string | null;
  };
  locale?: string;
}

export function ClubCard({ club, locale = "fr" }: ClubCardProps) {
  return (
    <Link href={`/${locale}/book/${club.id}`} className="block">
      <Card className="p-0 overflow-hidden hover:shadow-xl hover:shadow-gold/10 transition-all group cursor-pointer bg-surface border-gold/10 rounded-[2rem]">
      <div className="relative aspect-video bg-black overflow-hidden">
        {club.logo_url ? (
          <Image
            src={club.logo_url}
            alt={club.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black text-gold/30">
            <Laptop className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {club.type && (
            <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-md border border-white/10">
              {club.type}
            </Badge>
          )}
          <Badge variant="success" className="bg-emerald-500/90 text-white border-0 backdrop-blur-sm">
            Ouvert
          </Badge>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-white group-hover:text-gold transition-colors text-lg line-clamp-1">
              {club.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <MapPin className="h-3.5 w-3.5 text-gold/60" />
              <span>{club.city}, Tunisie</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gold/10 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gold shrink-0 border border-gold/20">
            <Star className="h-3.5 w-3.5 fill-gold" />
            <span>4.9</span>
          </div>
        </div>

        <button className="w-full py-3 bg-gold hover:bg-gold-light text-black rounded-xl text-sm font-bold transition-all transform active:scale-[0.98] shadow-lg shadow-gold/10">
          Réserver un terrain
        </button>
      </div>
    </Card>
    </Link>
  );
}
