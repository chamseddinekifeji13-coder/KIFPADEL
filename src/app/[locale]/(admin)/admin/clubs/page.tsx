import type { Metadata } from "next";
import Link from "next/link";

import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Badge } from "@/components/ui/badge";
import { fetchAdminClubDirectory } from "@/modules/admin/repository";
import { adminReactivateClubAction, adminSuspendClubAction } from "@/modules/admin/actions/moderation";

type AdminClubsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AdminClubsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Clubs | Super Admin" : "Clubs | Super Admin",
  };
}

export default async function AdminClubsPage({ params }: AdminClubsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const clubs = await fetchAdminClubDirectory();

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionTitle
          title="Clubs"
          subtitle="Liste réelle depuis Supabase — suspension / réactivation journalisée dans audit_log."
          className="bg-transparent p-0"
          titleClassName="text-slate-900"
          subtitleClassName="text-slate-500"
        />
        <Link
          href={`/${locale}/clubs/new`}
          className="text-sm font-bold text-gold hover:underline"
        >
          Flux création club (joueur / manager) →
        </Link>
      </header>

      <div className="grid gap-4">
        {clubs.map((club) => {
          const suspended = Boolean(club.suspended_at);
          return (
            <Card key={club.id} className="p-5 border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 truncate">{club.name}</h3>
                    <Badge variant="secondary" className={suspended ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>
                      {suspended ? "Suspendu" : club.is_active === false ? "Inactif (is_active)" : "Actif"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {club.city} · créé {new Date(club.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  {club.suspension_reason ? (
                    <p className="text-xs text-red-600">Motif&nbsp;: {club.suspension_reason}</p>
                  ) : null}
                  <p className="text-xs text-slate-400">
                    Dernière réservation (starts_at)&nbsp;:{" "}
                    {club.last_booking_starts_at
                      ? new Date(club.last_booking_starts_at).toLocaleString("fr-FR")
                      : "—"}
                  </p>
                  <Link href={`/${locale}/book/${club.id}`} className="text-xs font-bold text-sky-700 hover:underline">
                    Voir la page publique de réservation →
                  </Link>
                </div>

                <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-4">
                  {!suspended ? (
                    <form action={adminSuspendClubAction} className="space-y-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="club_id" value={club.id} />
                      <label className="sr-only" htmlFor={`reason-${club.id}`}>
                        Raison suspension
                      </label>
                      <textarea
                        id={`reason-${club.id}`}
                        name="reason"
                        required
                        placeholder="Raison suspension (obligatoire)"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
                      />
                      <button
                        type="submit"
                        className="w-full h-10 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700"
                      >
                        Suspendre le club
                      </button>
                    </form>
                  ) : (
                    <form action={adminReactivateClubAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="club_id" value={club.id} />
                      <button
                        type="submit"
                        className="w-full h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                      >
                        Réactiver le club
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {clubs.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun club retourné (vérifiez RLS / connexion).</p>
      ) : null}
    </div>
  );
}
