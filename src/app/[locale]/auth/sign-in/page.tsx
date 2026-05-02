import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { TextInput } from "@/components/ui/text-input";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { signInAction } from "@/modules/auth/actions/sign-in";

type SignInPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}>;

export async function generateMetadata({ params }: SignInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "Sign in" : "Se connecter";
  const description = isEn
    ? "Sign in to your Kifpadel account to book courts and join open matches."
    : "Connectez-vous à votre compte Kifpadel pour réserver des terrains et rejoindre des matchs ouverts.";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/auth/sign-in` },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `/${locale}/auth/sign-in` },
  };
}

export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { locale } = await params;
  const { error, status } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  return (
    <section className="space-y-3">
      <Card>
        <SectionTitle
          as="h1"
          title={dictionary.auth.signInTitle}
          subtitle={dictionary.auth.signInSubtitle}
        />
      </Card>

      {error ? (
        <Card className="bg-rose-50 ring-rose-100">
          <p className="text-sm text-rose-700">
            {error === "missing_fields"
              ? dictionary.auth.missingFieldsError
              : error === "auth_required"
                ? dictionary.errors.authRequired
                : dictionary.auth.invalidCredentialsError}
          </p>
        </Card>
      ) : null}

      {status === "check_email" ? (
        <Card className="bg-emerald-50 ring-emerald-100">
          <p className="text-sm text-emerald-700">{dictionary.auth.checkEmailInfo}</p>
        </Card>
      ) : null}

      <Card>
        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {dictionary.auth.emailLabel}
            </label>
            <TextInput 
              id="email" 
              name="email" 
              type="email" 
              placeholder="votre@email.com"
              required 
            />
          </div>
          <Button type="submit" className="w-full py-6 text-sm font-bold shadow-lg shadow-sky-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
            {dictionary.auth.magicLinkCta || "Recevoir mon lien de connexion"}
          </Button>
          <p className="text-[10px] text-center text-slate-400">
            Un lien de connexion sécurisé vous sera envoyé par email.
          </p>
        </form>
      </Card>

      <Card className="text-center">
        <p className="text-sm text-slate-600">{dictionary.auth.createAccountHint}</p>
        <Link
          href={`/${locale}/auth/sign-up`}
          className="mt-2 inline-block text-sm font-semibold text-sky-700"
        >
          {dictionary.auth.createAccountCta}
        </Link>
      </Card>
    </section>
  );
}
