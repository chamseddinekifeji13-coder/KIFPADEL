import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAuthenticatedUser } from "@/modules/auth/service";
import { completeOnboardingAction } from "@/modules/onboarding/actions";
import { TextInput } from "@/components/ui/text-input";

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

      <Card>
        <form action={completeOnboardingAction} className="space-y-6">
          <input type="hidden" name="locale" value={locale} />
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="displayName" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {dictionary.onboarding.displayNameLabel}
              </label>
              <TextInput 
                id="displayName" 
                name="displayName" 
                placeholder="Ex: Ahmed Padel"
                defaultValue={user?.email?.split('@')[0]}
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {dictionary.onboarding.cityLabel}
              </label>
              <TextInput 
                id="city" 
                name="city" 
                placeholder="Ex: Tunis"
                defaultValue="Tunis"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {dictionary.onboarding.levelLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Bronze', 'Silver', 'Gold'].map((level) => (
                  <label key={level} className="relative flex items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-white hover:border-sky-200 transition-all group">
                    <input type="radio" name="level" value={level} defaultChecked={level === 'Bronze'} className="sr-only peer" />
                    <span className="text-xs font-bold text-slate-600 peer-checked:text-sky-600 transition-colors">{level}</span>
                    <div className="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-sky-500 transition-all" />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full py-6 text-sm font-bold shadow-lg shadow-sky-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
            {dictionary.onboarding.completeProfileCta || "Finaliser mon profil"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
