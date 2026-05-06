import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";

type DashboardPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  
  await requireUser({ locale, redirectPath: "dashboard" });
  const dictionary = await getDictionary(locale as Locale);

  return (
    <div className="space-y-6">
      <header className="py-4">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
      </header>

      <section className="grid gap-4">
        <Card className="p-6">
          <SectionTitle
            title={dictionary.common.dashboardTitle}
            subtitle={dictionary.common.dashboardSubtitle}
          />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 space-y-2">
            <p className="text-sm font-bold text-slate-900">Vitesse de jeu</p>
            <p className="text-xs text-slate-500">Moyenne: 1.5h / match</p>
          </Card>
          
          <Card className="p-4 space-y-2">
            <p className="text-sm font-bold text-slate-900">Total Matchs</p>
            <p className="text-xs text-slate-500">12 parties ce mois</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
