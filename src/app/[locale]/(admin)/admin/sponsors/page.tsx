import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

import { listAllSponsorsForAdmin } from "@/modules/sponsors/repository";
import { adminCreateSponsorAction, adminToggleSponsorActiveAction, adminUpdateSponsorAction } from "@/modules/sponsors/actions";

type AdminSponsorsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSponsorsPage({ params }: AdminSponsorsPageProps) {
  const { locale } = await params;
  const sponsors = await listAllSponsorsForAdmin();

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Sponsors"
        subtitle="Table public.sponsors — actions journalisées (audit_log)."
        titleClassName="text-slate-900"
        subtitleClassName="text-slate-500"
      />

      <Card className="p-6 space-y-4 border-slate-100">
        <h3 className="font-black text-lg text-slate-900">Ajouter un sponsor</h3>
        <form action={adminCreateSponsorAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <div className="md:col-span-2 grid gap-1">
            <label htmlFor="sponsor-name" className="text-xs font-bold text-slate-500">Nom *</label>
            <input id="sponsor-name" name="name" required className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="sponsor-logo" className="text-xs font-bold text-slate-500">Logo URL</label>
            <input id="sponsor-logo" name="logo_url" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="sponsor-website" className="text-xs font-bold text-slate-500">Site web</label>
            <input id="sponsor-website" name="website_url" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="sponsor-position" className="text-xs font-bold text-slate-500">Position (tri)</label>
            <input id="sponsor-position" name="position" type="number" defaultValue={0} className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
              Créer
            </button>
          </div>
        </form>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {sponsors.map((s) => (
          <Card key={s.id} className="p-5 border-slate-100 space-y-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h4 className="font-black text-slate-900">{s.name}</h4>
                <p className="text-[10px] font-mono text-slate-400">{s.id}</p>
                <p className="text-xs mt-1">
                  <span className={s.is_active ? "text-emerald-600 font-bold" : "text-slate-400 font-bold"}>
                    {s.is_active ? "Actif" : "Inactif"}
                  </span>
                  {" · "}position {s.position}
                </p>
              </div>
              <form action={adminToggleSponsorActiveAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="is_active" value={s.is_active ? "false" : "true"} />
                <button
                  type="submit"
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  {s.is_active ? "Désactiver" : "Activer"}
                </button>
              </form>
            </div>

            <form action={adminUpdateSponsorAction} className="space-y-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={s.id} />
              <div className="grid gap-1">
                <label htmlFor={`name-${s.id}`} className="text-[10px] font-bold uppercase text-slate-500">Nom</label>
                <input id={`name-${s.id}`} name="name" defaultValue={s.name} required className="h-10 rounded-lg border px-3 text-sm" />
              </div>
              <div className="grid gap-1">
                <label htmlFor={`logo-${s.id}`} className="text-[10px] font-bold uppercase text-slate-500">Logo URL</label>
                <input id={`logo-${s.id}`} name="logo_url" defaultValue={s.logo_url ?? ""} className="h-10 rounded-lg border px-3 text-sm" />
              </div>
              <div className="grid gap-1">
                <label htmlFor={`website-${s.id}`} className="text-[10px] font-bold uppercase text-slate-500">Site</label>
                <input id={`website-${s.id}`} name="website_url" defaultValue={s.website_url ?? ""} className="h-10 rounded-lg border px-3 text-sm" />
              </div>
              <div className="grid gap-1">
                <label htmlFor={`pos-${s.id}`} className="text-[10px] font-bold uppercase text-slate-500">Position</label>
                <input
                  id={`pos-${s.id}`}
                  name="position"
                  type="number"
                  defaultValue={s.position}
                  className="h-10 rounded-lg border px-3 text-sm"
                />
              </div>
              <button type="submit" className="h-9 px-4 rounded-lg bg-gold text-black text-xs font-bold">
                Mettre à jour
              </button>
            </form>
          </Card>
        ))}
      </div>

      {sponsors.length === 0 ? <p className="text-sm text-slate-500">Aucun sponsor en base.</p> : null}
    </div>
  );
}
