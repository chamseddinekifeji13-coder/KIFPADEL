import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

import { fetchAdminTournaments } from "@/modules/admin/repository";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminTournamentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const rows = await fetchAdminTournaments(200);

  return (
    <div className="space-y-6">
      <SectionTitle title="Tournois (lecture seule)" subtitle="Liste globale pour opérations plateforme — pas de mise en avant payante dans cette version." />

      <Card className="overflow-hidden border-slate-100 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs uppercase text-slate-500 border-b">
                <th className="py-2 pr-2">Tournoi</th>
                <th className="py-2 pr-2">Club</th>
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
                    <span className="block text-[10px] font-mono text-slate-400">{t.id}</span>
                  </td>
                  <td className="py-2 pr-2">{t.club_name ?? t.club_id}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{t.status}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {t.starts_at ? new Date(t.starts_at).toLocaleString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className="text-slate-500 text-sm py-4">Aucun tournoi.</p> : null}
      </Card>
    </div>
  );
}
