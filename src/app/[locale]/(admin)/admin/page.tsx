import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Building2, Users, Calendar, Trophy, AlertTriangle } from "lucide-react";
import { fetchPlatformDashboardStats } from "@/modules/admin/repository";

export default async function AdminDashboardPage() {
  const stats = await fetchPlatformDashboardStats();

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Tableau de bord Super Admin"
        subtitle="Indicateurs issus de la base (V1 — lecture opérationnelle)."
        titleClassName="text-slate-900"
        subtitleClassName="text-slate-500"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Clubs"
          value={String(stats?.clubCount ?? "—")}
          icon={<Building2 className="h-5 w-5" />}
          color="blue"
        />
        <StatsCard
          title="Profils joueurs"
          value={String(stats?.profileCount ?? "—")}
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
        <StatsCard
          title="Réservations (7j)"
          value={String(stats?.bookingsLast7Days ?? "—")}
          icon={<Calendar className="h-5 w-5" />}
          color="amber"
        />
        <StatsCard
          title="Tournois ouverts"
          value={String(stats?.tournamentsOpenCount ?? "—")}
          icon={<Trophy className="h-5 w-5" />}
          color="purple"
        />
        <StatsCard
          title="Incidents (30j)"
          value={String(stats?.incidentsRecentCount ?? "—")}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="rose"
        />
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-2">Prochaines étapes</h3>
        <p className="text-sm text-slate-600">
          Campagnes marketing, e-mails et segmentation ne sont pas dans cette version. Utilisez les menus pour modérer
          clubs/joueurs, sponsors et consulter incidents / tournois.
        </p>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </Card>
  );
}
