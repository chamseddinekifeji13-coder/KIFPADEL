import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { IntentCard } from "@/components/ui/intent-card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type LocaleHomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: LocaleHomeProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <section className="space-y-3">
      <Card className="bg-slate-900 text-slate-50 ring-slate-900">
        <SectionTitle
          title={dictionary.player.homeTitle}
          subtitle={dictionary.player.homeSubtitle}
          titleClassName="text-xl font-semibold text-slate-50"
          subtitleClassName="text-sm text-slate-300"
        />
      </Card>
      <div className="grid gap-3">
        <IntentCard
          href={`/${locale}/play-now`}
          title={dictionary.common.playNow}
          description={dictionary.common.playNowDescription}
        />
        <IntentCard
          href={`/${locale}/find-players`}
          title={dictionary.common.findPlayers}
          description={dictionary.common.findPlayersDescription}
        />
        <IntentCard
          href={`/${locale}/book`}
          title={dictionary.common.bookCourt}
          description={dictionary.common.bookCourtDescription}
        />
      </div>
      <Card className="space-y-3">
        <p className="text-sm text-slate-700">
          {dictionary.onboarding.subtitle}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/${locale}/onboarding`} className="flex-1">
            <Button className="w-full">{dictionary.common.onboardingCta}</Button>
          </Link>
          <Link href={`/${locale}/auth/sign-in`} className="flex-1">
            <Button variant="secondary" className="w-full">
              {dictionary.common.authCta}
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
