import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAuthenticatedUser } from "@/modules/auth/service";
import { OnboardingWizard } from "./onboarding-wizard";

type OnboardingPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/onboarding`);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[10px] font-bold uppercase tracking-widest text-[var(--gold)] mb-4">
            Bienvenue
          </div>
          <h1 className="text-2xl font-bold text-white">
            {dictionary.onboarding.title}
          </h1>
          <p className="text-[var(--foreground-muted)] text-sm mt-2">
            {dictionary.onboarding.subtitle}
          </p>
        </div>

        <OnboardingWizard locale={locale} />
      </div>
    </div>
  );
}
