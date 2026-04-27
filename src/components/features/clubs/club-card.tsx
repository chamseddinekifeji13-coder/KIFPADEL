import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Laptop } from "lucide-react";

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    city: string;
    type: "Outdoor" | "Indoor";
    logo_url: string | null;
  };
}

export function ClubCard({ club }: ClubCardProps) {
  return (
    <Card className="p-0 overflow-hidden hover:shadow-lg transition-all group cursor-pointer border-slate-100">
      <div className="relative aspect-video bg-slate-200 overflow-hidden">
        {club.logo_url ? (
          <Image
            src={club.logo_url}
            alt={club.name}
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
            {club.type}
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
              {club.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="h-3 w-3" />
              <span>{club.city}, Tunisie</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold text-amber-600">
            <Star className="h-3 w-3 fill-amber-600" />
            <span>4.9</span>
          </div>
        </div>

        <button className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all transform active:scale-[0.98]">
          Réserver un terrain
        </button>
      </div>
    </Card>
  );
}
