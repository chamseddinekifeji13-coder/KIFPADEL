import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary } from "@/i18n/get-dictionary";
import { isGoogleAuthEnabled } from "@/lib/auth/google-auth-enabled";
import { GoogleSignInButton } from "@/components/features/auth/google-sign-in-button";
import { SignUpForm } from "@/components/features/auth/sign-up-form";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { parseReferrerIdParam } from "@/lib/referrals/referral-url";

type SignUpPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; error_detail?: string; next?: string; ref?: string }>;
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

function resolveSignUpError(
  error: string | undefined,
  dictionary: Awaited<ReturnType<typeof getDictionary>>,
) {
  if (!error) return null;
  const auth = dictionary.auth;
  switch (error) {
    case "missing_fields":
      return auth.missingFieldsError;
    case "user_exists":
      return auth.userExistsError;
    case "invalid_redirect_url":
      return auth.invalidRedirectUrlError;
    case "invalid_phone":
      return auth.invalidPhoneError;
    case "invalid_gender":
      return auth.invalidGenderError;
    case "phone_in_use":
      return auth.phoneInUseError;
    case "profile_trigger_error":
      return auth.profileTriggerError;
    case "auth_config_error":
      return auth.authConfigError;
    case "rate_limited":
      return auth.rateLimitedError;
    case "weak_password":
      return auth.weakPasswordError;
    case "invalid_email":
      return auth.invalidEmailError;
    case "bot_protection":
      return auth.botProtectionError;
    case "service_unavailable":
      return auth.serviceUnavailableError;
    default:
      return auth.signUpFailedError;
  }
}

export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const { locale } = await params;
  const { error, error_detail: errorDetail, next, ref: refRaw } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const errorMessage =
    errorDetail?.trim() ||
    resolveSignUpError(error, dictionary);
  const safeNext = sanitizeAuthNextPath(next, locale, `/${locale}/onboarding`);
  const referrerId = parseReferrerIdParam(refRaw);
  const authQuery = new URLSearchParams({ next: safeNext });
  if (referrerId) authQuery.set("ref", referrerId);
  const authQueryString = `?${authQuery.toString()}`;
  const googleAuthEnabled = isGoogleAuthEnabled();

  return (
    <section className="space-y-4">
      <Card>
        <SectionTitle
          as="h1"
          title={dictionary.auth.signUpTitle}
          subtitle={dictionary.auth.signUpSubtitle}
        />
      </Card>

      {errorMessage ? (
        <Card className="bg-rose-50 ring-rose-100">
          <p className="text-sm text-rose-700">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="space-y-4">
        {googleAuthEnabled ? (
          <>
            <p className="text-[10px] font-black text-gold uppercase tracking-widest text-center">
              {dictionary.auth.signUpGoogleRecommended}
            </p>
            <GoogleSignInButton
              locale={locale}
              next={safeNext}
              ref={referrerId ?? undefined}
              label={dictionary.auth.signUpWithGoogleCta}
              variant="primary"
            />
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              {dictionary.auth.signUpGoogleSecurityNote}
            </p>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-white px-3 text-slate-500 font-bold">
                  {dictionary.auth.orEmailSignUpDivider}
                </span>
              </div>
            </div>
          </>
        ) : null}

        <SignUpForm
          locale={locale}
          safeNext={safeNext}
          referrerId={referrerId}
          labels={{
            phoneLabel: dictionary.auth.phoneLabel,
            phoneSignupHint: dictionary.auth.phoneSignupHint,
            displayNameLabel: dictionary.auth.displayNameLabel,
            displayNamePlaceholder: dictionary.auth.displayNamePlaceholder,
            displayNameSignupHint: dictionary.auth.displayNameSignupHint,
            genderLabel: dictionary.auth.genderLabel,
            genderPlaceholder: dictionary.auth.genderPlaceholder,
            genderMale: dictionary.auth.genderMale,
            genderFemale: dictionary.auth.genderFemale,
            genderSignupHint: dictionary.auth.genderSignupHint,
            emailLabel: dictionary.auth.emailLabel,
            passwordLabel: dictionary.auth.passwordLabel,
            signUpCta: dictionary.auth.signUpCta,
            signUpSubmitting: dictionary.auth.signUpSubmitting,
            networkError: dictionary.auth.authNetworkError,
            errorByCode: {
              missing_fields: dictionary.auth.missingFieldsError,
              user_exists: dictionary.auth.userExistsError,
              invalid_redirect_url: dictionary.auth.invalidRedirectUrlError,
              invalid_phone: dictionary.auth.invalidPhoneError,
              invalid_gender: dictionary.auth.invalidGenderError,
              phone_in_use: dictionary.auth.phoneInUseError,
              profile_trigger_error: dictionary.auth.profileTriggerError,
              auth_config_error: dictionary.auth.authConfigError,
              rate_limited: dictionary.auth.rateLimitedError,
              weak_password: dictionary.auth.weakPasswordError,
              invalid_email: dictionary.auth.invalidEmailError,
              bot_protection: dictionary.auth.botProtectionError,
              service_unavailable: dictionary.auth.serviceUnavailableError,
              signup_failed: dictionary.auth.signUpFailedError,
            },
          }}
        />
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          {dictionary.auth.signUpWhatsAppRequiredNote}
        </p>
      </Card>

      <Card className="text-center">
        <p className="text-sm text-slate-600">{dictionary.auth.haveAccountHint}</p>
        <Link
          href={`/${locale}/auth/sign-in${authQueryString}`}
          className="mt-2 inline-block text-sm font-semibold text-sky-700"
        >
          {dictionary.auth.signInCta}
        </Link>
      </Card>
    </section>
  );
}
