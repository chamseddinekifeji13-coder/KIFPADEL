import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAuthenticatedUser } from "@/modules/auth/service";

type OnboardingPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const user = await getAuthenticatedUser();

  return (
    <section className="space-y-3">
      <Card>
        <SectionTitle
          title={dictionary.onboarding.title}
          subtitle={dictionary.onboarding.subtitle}
        />
      </Card>

      {!user ? (
        <Card className="space-y-2 bg-amber-50 ring-amber-100">
          <p className="text-sm text-amber-800">{dictionary.errors.authRequired}</p>
          <Link href={`/${locale}/auth/sign-in`}>
            <Button className="w-full">{dictionary.auth.signInCta}</Button>
          </Link>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <p className="text-sm font-medium text-slate-800">{dictionary.onboarding.stepIntent}</p>
        <div className="grid gap-2">
          <Button variant="secondary" className="justify-start">
            {dictionary.common.playNow}
          </Button>
          <Button variant="secondary" className="justify-start">
            {dictionary.common.findPlayers}
          </Button>
          <Button variant="secondary" className="justify-start">
            {dictionary.common.bookCourt}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-slate-800">{dictionary.onboarding.stepLevel}</p>
        <p className="text-sm text-slate-600">N2-N3 (MVP preset)</p>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-slate-800">{dictionary.onboarding.stepClub}</p>
        <p className="text-sm text-slate-600">Kif Padel Tunis</p>
      </Card>

      {user ? (
        <Button className="w-full">{dictionary.onboarding.continueCta}</Button>
      ) : (
        <Button variant="secondary" className="w-full" type="button">
          {dictionary.onboarding.continueCta}
        </Button>
      )}
    </section>
  );
}
