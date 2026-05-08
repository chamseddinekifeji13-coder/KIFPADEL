import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Badge } from "@/components/ui/badge";
import { fetchAdminPlayersList } from "@/modules/admin/repository";
import { adminReactivatePlayerAction, adminSuspendPlayerAction } from "@/modules/admin/actions/moderation";

type AdminPlayersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: AdminPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Players | Super Admin" : "Joueurs | Super Admin",
  };
}

export default async function AdminPlayersPage({ params, searchParams }: AdminPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { q } = await searchParams;
  const players = await fetchAdminPlayersList({ search: q ?? null, limit: 80 });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4">
        <SectionTitle
          title="Joueurs"
          subtitle="PII réservée aux comptes super_admin (voir docs/SUPER_ADMIN.md)."
          className="bg-transparent p-0"
        />

        <form method="GET" action="" className="flex gap-2 max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher nom, email, téléphone…"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
          <button type="submit" className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">
            OK
          </button>
        </form>
      </header>

      <Card className="overflow-hidden border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">Joueur</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">Club principal</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">Ligue / ELO</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">Trust</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">Suspension</th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {players.map((p) => {
                const suspended = Boolean(p.suspended_at);
                return (
                  <tr key={p.id} className="align-top hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{p.display_name ?? "—"}</p>
                      <p className="text-xs text-slate-500">{p.email ?? "—"}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.main_club_name ? (
                        <>
                          <p>{p.main_club_name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{p.main_club_id}</p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold">{p.league ?? "—"}</span>
                      <p className="text-xs text-slate-500">ELO {p.sport_rating ?? "—"}</p>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {p.reliability_status ?? "?"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono">{p.trust_score ?? "—"}</td>
                    <td className="px-4 py-3">
                      {suspended ? (
                        <Badge className="bg-red-50 text-red-700 hover:bg-red-50">Suspendu</Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                          Actif
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right w-[260px]">
                      <div className="flex flex-col gap-2 items-stretch">
                        {!suspended ? (
                          <form action={adminSuspendPlayerAction} className="space-y-1 text-left">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="player_id" value={p.id} />
                            <textarea
                              name="reason"
                              required
                              placeholder="Raison"
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs min-h-[48px]"
                            />
                            <button type="submit" className="w-full h-8 rounded-lg bg-red-600 text-white text-xs font-bold">
                              Suspendre
                            </button>
                          </form>
                        ) : (
                          <form action={adminReactivatePlayerAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="player_id" value={p.id} />
                            <button
                              type="submit"
                              className="w-full h-8 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                            >
                              Réactiver
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Important&nbsp;: suspendre un profil fixe suspended_at&nbsp;; le trust automatique (/ apply_trust_adjustment)
        continue d&apos;être géré séparément côté clubs.
      </p>
    </div>
  );
}
