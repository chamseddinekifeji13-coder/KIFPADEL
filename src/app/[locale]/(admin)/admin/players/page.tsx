import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  UserMinus, 
  Mail,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AdminPlayersPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AdminPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Manage Players | Admin" : "Gestion des Joueurs | Admin",
  };
}

export default async function AdminPlayersPage({ params }: AdminPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Mock data for all platform players
  const players = [
    { id: "1", name: "Ahmed B.", email: "ahmed@example.com", status: "active", league: "gold", trustScore: 98, joined: "2026-01-15" },
    { id: "2", name: "Sarah M.", email: "sarah@example.com", status: "active", league: "silver", trustScore: 85, joined: "2026-02-10" },
    { id: "3", name: "Mehdi K.", email: "mehdi@example.com", status: "suspended", league: "bronze", trustScore: 32, joined: "2026-03-05" },
    { id: "4", name: "Youssef T.", email: "youssef@example.com", status: "active", league: "silver", trustScore: 78, joined: "2026-03-20" },
    { id: "5", name: "Ines L.", email: "ines@example.com", status: "active", league: "gold", trustScore: 92, joined: "2026-04-01" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionTitle 
          title="Gestion des Joueurs" 
          subtitle="Gérez l'ensemble des joueurs inscrits sur la plateforme Kifpadel."
          className="bg-transparent p-0"
        />
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
            <Mail className="h-4 w-4" />
            Email groupé
          </button>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher un joueur (nom, email...)" 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all">
            <Filter className="h-4 w-4" />
            Filtres
          </button>
        </div>
      </div>

      {/* Players Table */}
      <Card className="overflow-hidden border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Joueur</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Statut</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Niveau</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Trust</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {players.map((player) => (
                <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {player.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{player.name}</p>
                        <p className="text-xs text-slate-500">{player.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant={player.status === "active" ? "default" : "secondary"}
                      className={player.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}
                    >
                      {player.status === "active" ? "Actif" : "Suspendu"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold uppercase text-slate-600">{player.league}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full w-[var(--progress)] ${player.trustScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ "--progress": `${player.trustScore}%` } as React.CSSProperties}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{player.trustScore}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Voir le profil">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Suspendre">
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
