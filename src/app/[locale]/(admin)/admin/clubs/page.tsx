import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  MapPin,
  Plus,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type AdminClubsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AdminClubsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Manage Clubs | Admin" : "Gestion des Clubs | Admin",
  };
}

export default async function AdminClubsPage({ params }: AdminClubsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Mock data for clubs
  const clubs = [
    { id: "1", name: "Padel Marsa", city: "La Marsa", status: "active", courts: 4, joined: "2026-01-10" },
    { id: "2", name: "Gammarth Padel Club", city: "Gammarth", status: "active", courts: 6, joined: "2026-01-15" },
    { id: "3", name: "Lac Padel", city: "Berges du Lac", status: "pending", courts: 3, joined: "2026-04-20" },
    { id: "4", name: "Sousse Padel Arena", city: "Sousse", status: "active", courts: 8, joined: "2026-02-05" },
    { id: "5", name: "Djerba Padel", city: "Djerba", status: "inactive", courts: 2, joined: "2026-03-12" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionTitle 
          title="Gestion des Clubs" 
          subtitle="Validez et gérez les clubs partenaires de Kifpadel."
          className="bg-transparent p-0"
        />
        <Link 
          href={`/${locale}/clubs/new`}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gold text-black rounded-xl text-sm font-bold hover:bg-gold/90 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Ajouter un Club
        </Link>
      </header>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Actifs</p>
            <p className="text-xl font-black text-slate-900">12</p>
          </div>
        </Card>
        <Card className="p-4 border-slate-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">En attente</p>
            <p className="text-xl font-black text-slate-900">3</p>
          </div>
        </Card>
        <Card className="p-4 border-slate-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Terrains</p>
            <p className="text-xl font-black text-slate-900">42</p>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher un club (nom, ville...)" 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
          />
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <Card key={club.id} className="group overflow-hidden border-slate-100 hover:border-gold/30 hover:shadow-lg transition-all duration-300">
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-gold/10 group-hover:text-gold transition-colors">
                  <Building2 className="h-6 w-6" />
                </div>
                <Badge 
                  variant="secondary"
                  className={
                    club.status === "active" ? "bg-emerald-100 text-emerald-700" : 
                    club.status === "pending" ? "bg-amber-100 text-amber-700" : 
                    "bg-slate-100 text-slate-700"
                  }
                >
                  {club.status === "active" ? "Actif" : club.status === "pending" ? "Attente" : "Inactif"}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-gold transition-colors">{club.name}</h3>
                <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{club.city}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">Terrains</p>
                  <p className="font-black text-slate-900">{club.courts}</p>
                </div>
                <button className="h-10 w-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
