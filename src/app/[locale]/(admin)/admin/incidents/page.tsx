import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

import {
  fetchAdminIncidents,
  fetchAdminTrustEventsRecent,
} from "@/modules/admin/repository";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminIncidentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [incidents, trustEvents] = await Promise.all([fetchAdminIncidents(120), fetchAdminTrustEventsRecent(80)]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Incidents & confiance (lecture seule)"
        subtitle="Vision transverse — pas de traitement depuis cette page."
        titleClassName="text-slate-900"
        subtitleClassName="text-slate-500"
      />

      <Card className="overflow-hidden border-slate-100 p-4">
        <h3 className="font-bold mb-3">Incidents récents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs uppercase text-slate-500 border-b">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Club</th>
                <th className="py-2 pr-2">Joueur</th>
                <th className="py-2 pr-2">Raison</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className="border-b border-slate-50">
                  <td className="py-2 pr-2 whitespace-nowrap">{new Date(i.created_at).toLocaleString("fr-FR")}</td>
                  <td className="py-2 pr-2">
                    <Link href={`/${locale}/book/${i.club_id}`} className="font-bold text-sky-700 hover:underline">
                      {i.club_name ?? i.club_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-2 pr-2">
                    <span className="font-medium">{i.player_display_name ?? "—"}</span>
                    <span className="block text-[10px] font-mono text-slate-400">{i.player_id}</span>
                  </td>
                  <td className="py-2 pr-2">{i.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {incidents.length === 0 ? <p className="text-slate-500 text-sm py-4">Aucune ligne.</p> : null}
      </Card>

      <Card className="overflow-hidden border-slate-100 p-4">
        <h3 className="font-bold mb-3">Trust events récents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs uppercase text-slate-500 border-b">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Joueur</th>
                <th className="py-2 pr-2">Kind</th>
                <th className="py-2 pr-2">Δ</th>
                <th className="py-2 pr-2">booking</th>
              </tr>
            </thead>
            <tbody>
              {trustEvents.map((t) => (
                <tr key={t.id} className="border-b border-slate-50">
                  <td className="py-2 pr-2 whitespace-nowrap">{new Date(t.created_at).toLocaleString("fr-FR")}</td>
                  <td className="py-2 pr-2">
                    {t.player_display_name ?? "—"}
                    <span className="block text-[10px] font-mono text-slate-400">{t.player_id}</span>
                  </td>
                  <td className="py-2 pr-2 font-mono text-xs">{t.kind}</td>
                  <td className="py-2 pr-2">{t.delta}</td>
                  <td className="py-2 pr-2 font-mono text-[10px]">{t.booking_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
