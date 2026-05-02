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

export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  return (
    <section className="space-y-3">
      <Card>
        <SectionTitle
          title={dictionary.auth.signUpTitle}
          subtitle={dictionary.auth.signUpSubtitle}
        />
      </Card>

      {error ? (
        <Card className="bg-rose-50 ring-rose-100">
          <p className="text-sm text-rose-700">
            {error === "missing_fields"
              ? dictionary.auth.missingFieldsError
              : dictionary.auth.signUpFailedError}
          </p>
        </Card>
      ) : null}

      <Card>
        <form action={signUpAction} className="space-y-4">
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
            Un lien magique vous sera envoyé pour une connexion sécurisée sans mot de passe.
          </p>
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
