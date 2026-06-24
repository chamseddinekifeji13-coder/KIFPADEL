import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

import { SponsorCreateForm } from "@/components/features/admin/sponsor-create-form";
import { SponsorEditForm } from "@/components/features/admin/sponsor-edit-form";
import { listAllSponsorsForAdmin } from "@/modules/sponsors/repository";
import { adminToggleSponsorActiveAction } from "@/modules/sponsors/actions";

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
        subtitle="Table public.sponsors — logos hébergés sur Supabase Storage ou URL externe."
        titleClassName="text-slate-900"
        subtitleClassName="text-slate-500"
      />

      <Card className="p-6 space-y-4 border-slate-100">
        <h3 className="font-black text-lg text-slate-900">Ajouter un sponsor</h3>
        <SponsorCreateForm locale={locale} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {sponsors.map((s) => (
          <Card key={s.id} className="p-5 border-slate-100 space-y-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex gap-3 items-start">
                {s.logo_url ? (
                  <div className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 bg-white p-2 flex items-center justify-center">
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : null}
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

            <SponsorEditForm locale={locale} sponsor={s} />
          </Card>
        ))}
      </div>

      {sponsors.length === 0 ? <p className="text-sm text-slate-500">Aucun sponsor en base.</p> : null}
    </div>
  );
}
