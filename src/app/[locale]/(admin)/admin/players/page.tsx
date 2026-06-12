import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/ui/section-title";
import { AdminDeleteAccountForm } from "@/components/features/admin/admin-delete-account-form";
import {
  adminCardClassName,
  adminInputClassName,
  adminTextareaClassName,
} from "@/components/features/admin/admin-form-styles";
import {
  adminDeletePlayerAction,
  adminReactivatePlayerAction,
  adminSuspendPlayerAction,
} from "@/modules/admin/actions/moderation";
import { fetchAdminPlayersList } from "@/modules/admin/repository";

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
          subtitle="Modération et suppression de comptes — données visibles uniquement pour super_admin."
          className="bg-transparent p-0"
          titleClassName="text-slate-900"
          subtitleClassName="text-slate-500"
        />

        <form method="GET" action="" className="flex gap-2 max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher nom, email, téléphone…"
            className={adminInputClassName}
          />
          <button
            type="submit"
            className="h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 shrink-0"
          >
            Rechercher
          </button>
        </form>
      </header>

      <div className="grid gap-4">
        {players.map((p) => {
          const suspended = Boolean(p.suspended_at);
          const isSuperAdmin = String(p.global_role ?? "").toLowerCase() === "super_admin";

          return (
            <article key={p.id} className={adminCardClassName}>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-lg text-slate-900 truncate">
                      {p.display_name ?? "Joueur sans nom"}
                    </h2>
                    {suspended ? (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Suspendu</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Actif</Badge>
                    )}
                    {isSuperAdmin ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900">Super admin</Badge>
                    ) : null}
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</dt>
                      <dd className="text-slate-800">{p.email ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Téléphone</dt>
                      <dd className="text-slate-800">{p.phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Club principal</dt>
                      <dd className="text-slate-800">{p.main_club_name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ligue / ELO</dt>
                      <dd className="text-slate-800">
                        {p.league ?? "—"} · ELO {p.sport_rating ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trust</dt>
                      <dd className="font-mono text-slate-900">{p.trust_score ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fiabilité</dt>
                      <dd className="text-slate-800">{p.reliability_status ?? "—"}</dd>
                    </div>
                  </dl>

                  {p.suspension_reason ? (
                    <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                      Motif suspension : {p.suspension_reason}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 w-full lg:w-[300px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-5">
                  {!suspended ? (
                    <form action={adminSuspendPlayerAction} className="space-y-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="player_id" value={p.id} />
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Suspendre le joueur
                      </label>
                      <textarea
                        name="reason"
                        required
                        placeholder="Raison de la suspension"
                        className={adminTextareaClassName}
                      />
                      <button
                        type="submit"
                        className="w-full h-10 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700"
                      >
                        Suspendre
                      </button>
                    </form>
                  ) : (
                    <form action={adminReactivatePlayerAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="player_id" value={p.id} />
                      <button
                        type="submit"
                        className="w-full h-10 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                      >
                        Réactiver le joueur
                      </button>
                    </form>
                  )}

                  {!isSuperAdmin ? (
                    <AdminDeleteAccountForm
                      locale={locale}
                      entityId={p.id}
                      entityLabel={p.display_name ?? p.email ?? "ce joueur"}
                      idFieldName="player_id"
                      action={adminDeletePlayerAction}
                      buttonLabel="Supprimer le compte joueur"
                    />
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-2 border border-dashed border-slate-200 rounded-lg">
                      Compte super_admin protégé
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">Aucun joueur trouvé.</p>
      ) : null}

      <p className="text-xs text-slate-500">
        La suspension fixe <code className="text-slate-700">suspended_at</code> ; le trust est géré
        séparément via les clubs.
      </p>
    </div>
  );
}
