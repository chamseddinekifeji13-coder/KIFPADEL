import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { TextInput } from "@/components/ui/text-input";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { signUpAction } from "@/modules/auth/actions/sign-up";

type SignUpPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}>;

export async function generateMetadata({ params }: SignUpPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "Create your account" : "Créer un compte";
  const description = isEn
    ? "Create a free Kifpadel account to book padel courts and meet players in Tunisia."
    : "Créez gratuitement votre compte Kifpadel pour réserver des terrains et rencontrer des joueurs en Tunisie.";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/auth/sign-up` },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `/${locale}/auth/sign-up` },
  };
}

export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  return (
    <section className="space-y-3">
      <Card>
        <SectionTitle
          as="h1"
          title={dictionary.auth.signUpTitle}
          subtitle={dictionary.auth.signUpSubtitle}
        />
      </Card>

      {error ? (
        <Card className="bg-rose-50 ring-rose-100">
          <p className="text-sm text-rose-700">
            {error === "missing_fields"
              ? dictionary.auth.missingFieldsError
              : error === "user_exists"
                ? dictionary.auth.userExistsError
                : error === "invalid_redirect_url"
                  ? dictionary.auth.invalidRedirectUrlError
              : dictionary.auth.signUpFailedError}
          </p>
        </Card>
      ) : null}

      <Card>
        <form action={signUpAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-slate-700">
              {dictionary.auth.emailLabel}
            </label>
            <TextInput id="email" name="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-slate-700">
              {dictionary.auth.passwordLabel}
            </label>
            <TextInput id="password" name="password" type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            {dictionary.auth.signUpCta}
          </Button>
        </form>
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
