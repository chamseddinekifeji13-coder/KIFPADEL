import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { parseReferrerIdParam } from "@/lib/referrals/referral-url";
import { isGoogleAuthEnabled } from "@/lib/auth/google-auth-enabled";
import { GoogleSignInButton } from "@/components/features/auth/google-sign-in-button";
import { SignInForm } from "@/components/features/auth/sign-in-form";
import { ResendActivationEmailButton } from "@/components/features/auth/resend-activation-email-button";

type SignInPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; status?: string; next?: string; ref?: string }>;
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
  const { error, status, next, ref: refRaw } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const googleAuthEnabled = isGoogleAuthEnabled();
  const safeNext = sanitizeAuthNextPath(next, locale, `/${locale}/profile`);
  const referrerId = parseReferrerIdParam(refRaw);
  const signUpQuery = new URLSearchParams({ next: safeNext });
  if (referrerId) signUpQuery.set("ref", referrerId);
  const signUpHref = `/${locale}/auth/sign-up?${signUpQuery.toString()}`;

  return (
    <section className="space-y-6 flex flex-col items-center">
      <Card className="w-full">
        <SectionTitle
          as="h1"
          title={dictionary.auth.signInTitle}
          subtitle={dictionary.auth.signInSubtitle}
        />
      </Card>

      {error ? (
        <Card className="bg-rose-500/5 border-rose-500/20">
          <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">
            {error === "missing_fields"
              ? dictionary.auth.missingFieldsError
              : error === "email_not_confirmed"
                ? dictionary.auth.emailNotConfirmedError
                : error === "callback_failed"
                  ? dictionary.auth.callbackFailedError
              : error === "auth_config_error"
                ? dictionary.auth.authConfigError
                : error === "rate_limited"
                  ? dictionary.auth.rateLimitedError
              : error === "auth_required"
                ? dictionary.errors.authRequired
                : error === "gmail_required"
                  ? dictionary.auth.gmailRequiredError
                  : dictionary.auth.invalidCredentialsError}
          </p>
        </Card>
      ) : null}

      {status === "check_email" ? (
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{dictionary.auth.checkEmailInfo}</p>
        </Card>
      ) : null}

      {status === "email_confirmed" ? (
        <Card className="bg-emerald-50 ring-emerald-100">
          <p className="text-sm text-emerald-700">{dictionary.auth.emailConfirmedSignInHint}</p>
        </Card>
      ) : null}

      {status === "password_updated" ? (
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{dictionary.auth.passwordUpdatedInfo}</p>
        </Card>
      ) : null}

      {error === "email_not_confirmed" ? (
        <Card className="bg-amber-50 ring-amber-100">
          <ResendActivationEmailButton
            locale={locale}
            label={dictionary.auth.resendActivationCta}
            successLabel={dictionary.auth.resendActivationSuccess}
            errorLabel={dictionary.auth.resendActivationError}
          />
        </Card>
      ) : null}

      <Card className="w-full space-y-4">
        {googleAuthEnabled ? (
          <>
            <GoogleSignInButton
              locale={locale}
              next={safeNext}
              ref={referrerId ?? undefined}
              label={dictionary.auth.signInWithGoogleCta}
              variant="primary"
            />
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-surface px-3 text-foreground-muted font-bold">
                  {dictionary.auth.orEmailDivider}
                </span>
              </div>
            </div>
          </>
        ) : null}
        <SignInForm
          locale={locale}
          safeNext={safeNext}
          forgotPasswordHref={`/${locale}/auth/reset-password`}
          labels={{
            emailLabel: dictionary.auth.emailLabel,
            passwordLabel: dictionary.auth.passwordLabel,
            signInCta: dictionary.auth.signInCta,
            signInSubmitting: dictionary.auth.signInSubmitting,
            forgotPasswordCta: dictionary.auth.forgotPasswordCta,
            networkError: dictionary.auth.authNetworkError,
          }}
        />
      </Card>

      <Card className="w-full text-center">
        <p className="text-sm text-foreground-muted">{dictionary.auth.createAccountHint}</p>
        <Link
          href={signUpHref}
          className="mt-2 inline-block text-sm font-black text-gold uppercase tracking-widest"
        >
          {dictionary.auth.createAccountCta}
        </Link>
      </Card>
    </section>
  );
}
