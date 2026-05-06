import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Building2, Users, Star, Award } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <SectionTitle 
        title="Tableau de bord Superadmin" 
        subtitle="Gérez l'ensemble de la plateforme Kifpadel."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Clubs actifs" 
          value="12" 
          icon={<Building2 className="h-5 w-5" />} 
          color="blue"
        />
        <StatsCard 
          title="Joueurs inscrits" 
          value="450" 
          icon={<Users className="h-5 w-5" />} 
          color="green"
        />
        <StatsCard 
          title="Matchs joués" 
          value="1,240" 
          icon={<Star className="h-5 w-5" />} 
          color="amber"
        />
        <StatsCard 
          title="Sponsors" 
          value="5" 
          icon={<Award className="h-5 w-5" />} 
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
              Ajouter un Sponsor
            </button>
            <button className="p-4 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
              Valider un Club
            </button>
            <button className="p-4 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
              Gérer les Signalements
            </button>
            <button className="p-4 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
              Paramètres système
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Activités récentes</h3>
          <div className="space-y-3">
            <ActivityItem text="Nouveau club 'Padel House' inscrit" time="Il y a 2h" />
            <ActivityItem text="Joueur 'Ahmed K.' a atteint le niveau Gold" time="Il y a 5h" />
            <ActivityItem text="Nouvel incident signalé au club Marsa" time="Il y a 12h" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </Card>
  );
}

function ActivityItem({ text, time }: { text: string, time: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <p className="text-sm text-slate-700">{text}</p>
      <span className="text-[10px] font-bold text-slate-400">{time}</span>
    </div>
  );
}
