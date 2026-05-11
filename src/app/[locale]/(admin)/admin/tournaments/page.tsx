import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

import { fetchActiveClubsForSelect, fetchAdminTournaments } from "@/modules/admin/repository";
import { PlatformTournamentCreateForm } from "@/app/[locale]/(admin)/admin/tournaments/platform-tournament-create-form";

function scopeLabelFr(scope: string): string {
  switch (scope) {
    case "interclub":
      return "Inter-clubs";
    case "inter_region":
      return "Inter-région";
    case "platform":
      return "Plateforme";
    case "single_club":
    default:
      return "Club";
  }
}

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminTournamentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [rows, clubs] = await Promise.all([fetchAdminTournaments(200), fetchActiveClubsForSelect()]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Tournois plateforme"
        subtitle="Création Super Admin (inter-clubs, inter-région, national) + liste globale."
        titleClassName="text-slate-900"
        subtitleClassName="text-slate-500"
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <PlatformTournamentCreateForm locale={locale} clubs={clubs} />
        <Card className="overflow-hidden border-slate-100 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Liste des tournois</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="py-2 pr-2">Tournoi</th>
                  <th className="py-2 pr-2">Portée</th>
                  <th className="py-2 pr-2">Club hôte</th>
                  <th className="py-2 pr-2">Statut</th>
                  <th className="py-2 pr-2">Début</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2">
                      <Link href={`/${locale}/tournaments/${t.id}`} className="font-bold text-sky-700 hover:underline">
                        {t.title}
                      </Link>
                      <span className="block font-mono text-[10px] text-slate-400">{t.id}</span>
                    </td>
                    <td className="py-2 pr-2 text-xs">{scopeLabelFr(t.tournament_scope)}</td>
                    <td className="py-2 pr-2">{t.club_name ?? t.club_id}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{t.status}</td>
                    <td className="whitespace-nowrap py-2 pr-2">
                      {t.starts_at ? new Date(t.starts_at).toLocaleString("fr-FR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? <p className="py-4 text-sm text-slate-500">Aucun tournoi.</p> : null}
        </Card>
      </div>
    </div>
  );
}
