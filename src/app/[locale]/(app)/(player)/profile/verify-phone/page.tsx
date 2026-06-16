import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { PhoneVerificationForm } from "@/components/features/phone/phone-verification-form";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPhoneVerificationChannel } from "@/lib/phone/verification-channel";

type VerifyPhonePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function VerifyPhonePage({ params, searchParams }: VerifyPhonePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await requireUser({ locale, redirectPath: "profile/verify-phone" });
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  const { next: nextPath } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, phone_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  const meta = user.user_metadata as { phone_local?: string; phone_display?: string } | undefined;
  const initialPhone =
    profile?.phone?.replace(/\s/g, "") ??
    meta?.phone_local ??
    meta?.phone_display?.replace(/\s/g, "") ??
    "";
  const phoneVerified = Boolean(profile?.phone_verified_at);
  const verificationChannel = getPhoneVerificationChannel();

  const safeNext =
    nextPath && nextPath.startsWith(`/${locale}/`) ? nextPath : `/${locale}/book`;

  return (
    <section className="space-y-4 pb-24">
      <Link
        href={`/${locale}/profile`}
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--foreground-muted)] hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {labels.accountBackToProfile}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">{labels.verifyPhonePageTitle}</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">{labels.verifyPhonePageSubtitle}</p>
      </div>

      <Card className="p-5">
        <PhoneVerificationForm
          channel={verificationChannel}
          initialPhone={initialPhone}
          initialVerified={phoneVerified}
          redirectOnSuccess={phoneVerified ? undefined : safeNext}
          labels={{
            title: labels.verifyPhoneFormTitle,
            subtitle: labels.verifyPhoneFormSubtitle,
            verifiedTitle: labels.verifyPhoneVerifiedTitle,
            phoneLabel: labels.verifyPhoneFieldLabel,
            sendCode: labels.verifyPhoneSendCode,
            sending: labels.verifyPhoneSending,
            verifyCode: labels.verifyPhoneVerifyCode,
            verifying: labels.verifyPhoneVerifying,
            confirmPhone: labels.verifyPhoneConfirmCta,
            confirming: labels.verifyPhoneConfirming,
            hint: labels.verifyPhoneHint,
            codePlaceholder: labels.verifyPhoneCodePlaceholder,
            emailCodeHint: labels.verifyPhoneEmailCodeHint,
          }}
        />
      </Card>
    </section>
  );
}
