import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
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
    <section className="space-y-3">
      <Card>
        <SectionTitle
          title={dictionary.common.dashboardTitle}
          subtitle={dictionary.common.dashboardSubtitle}
        />
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-slate-900">
          {dictionary.player.dashboardNextMatchTitle}
        </p>
        <p className="text-sm text-slate-600">{dictionary.player.dashboardNextMatchSubtitle}</p>
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-slate-900">
          {dictionary.player.dashboardProgressTitle}
        </p>
        <p className="text-sm text-slate-600">{dictionary.player.dashboardProgressSubtitle}</p>
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-slate-900">
          {dictionary.player.dashboardClubTitle}
        </p>
        <p className="text-sm text-slate-600">{dictionary.player.dashboardClubSubtitle}</p>
        <Link href={`/${locale}/club/dashboard`}>
          <Button variant="secondary" className="w-full">
            {dictionary.player.dashboardClubCta}
          </Button>
        </Link>
      </Card>
    </section>
  );
}
