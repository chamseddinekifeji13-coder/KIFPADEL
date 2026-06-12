import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { GoogleSignInButton } from "@/components/features/auth/google-sign-in-button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type SignUpPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}>;

export async function generateMetadata({ params }: SignUpPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "Create your account" : "Créer un compte";
  const description = isEn
    ? "Create a free Kifpadel account with your Gmail to book padel courts in Tunisia."
    : "Créez votre compte Kifpadel avec Gmail pour réserver des terrains en Tunisie.";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/auth/sign-up` },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `/${locale}/auth/sign-up` },
  };
}

function resolveSignUpError(
  error: string | undefined,
  dictionary: Awaited<ReturnType<typeof getDictionary>>,
) {
  if (!error) return null;
  const auth = dictionary.auth;
  switch (error) {
    case "gmail_required":
      return auth.gmailRequiredError;
    case "use_google":
      return auth.useGoogleSignUpHint;
    default:
      return auth.signUpFailedError;
  }
}

export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const errorMessage = resolveSignUpError(error, dictionary);
  const onboardingNext = `/${locale}/onboarding`;

  return (
    <section className="space-y-4">
      <Card>
        <SectionTitle
          as="h1"
          title={dictionary.auth.signUpTitle}
          subtitle={dictionary.auth.signUpGoogleSubtitle}
        />
      </Card>

      {errorMessage ? (
        <Card className="bg-rose-50 ring-rose-100">
          <p className="text-sm text-rose-700">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <GoogleSignInButton
          locale={locale}
          next={onboardingNext}
          label={dictionary.auth.signUpWithGoogleCta}
          variant="primary"
        />
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          {dictionary.auth.signUpGoogleSecurityNote}
        </p>
      </Card>

      <Card className="text-center">
        <p className="text-sm text-slate-600">{dictionary.auth.haveAccountHint}</p>
        <Link
          href={`/${locale}/auth/sign-in`}
          className="mt-2 inline-block text-sm font-semibold text-sky-700"
        >
          {dictionary.auth.signInCta}
        </Link>
      </Card>
    </section>
  );
}
