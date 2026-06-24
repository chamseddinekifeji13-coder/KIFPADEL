import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAuthenticatedUser } from "@/modules/auth/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPhoneVerificationChannel } from "@/lib/phone/verification-channel";
import { OnboardingWizard } from "./onboarding-wizard";

type OnboardingPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}>;

export default async function OnboardingPage({ params, searchParams }: OnboardingPageProps) {
  const { locale } = await params;
  const { error: urlError } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/onboarding`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, phone_verified_at, display_name, avatar_url, gender")
    .eq("id", user.id)
    .maybeSingle();

  const avatarFromMetadata =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const initialAvatarUrl = profile?.avatar_url ?? avatarFromMetadata;

  const meta = user.user_metadata as { phone_local?: string; phone_display?: string } | undefined;
  const initialPhone =
    profile?.phone?.replace(/\s/g, "") ??
    meta?.phone_local ??
    meta?.phone_display?.replace(/\s/g, "") ??
    "";
  const phoneVerified = Boolean(profile?.phone_verified_at);
  const verificationChannel = getPhoneVerificationChannel();

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--gold)]/20 shadow-xl shadow-[var(--gold)]/5 p-1">
              <img 
                src="/logo.png" 
                alt="Kifpadel Logo" 
                className="h-full w-full object-contain"
              />
            </div>
          </div>
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

        <OnboardingWizard
          locale={locale}
          initialPhone={initialPhone}
          initialStep={phoneVerified ? "profile" : "phone"}
          initialPhoneVerified={phoneVerified}
          verificationChannel={verificationChannel}
          initialAvatarUrl={initialAvatarUrl}
          initialDisplayName={profile?.display_name ?? ""}
          initialGender={
            profile?.gender === "male" || profile?.gender === "female" ? profile.gender : ""
          }
          initialUrlError={urlError}
          avatarLabels={{
            title: dictionary.player.profileAvatarTitle,
            subtitle: dictionary.onboarding.profileAvatarOptional,
            uploadCta: dictionary.player.profileAvatarUploadCta,
            selfieCta: dictionary.player.profileAvatarSelfieCta,
            uploading: dictionary.player.profileAvatarUploading,
            hint: dictionary.player.profileAvatarHint,
            selfieTitle: dictionary.player.profileAvatarSelfieTitle,
            selfieCapture: dictionary.player.profileAvatarSelfieCapture,
            selfieCancel: dictionary.player.profileAvatarSelfieCancel,
            cameraError: dictionary.player.profileAvatarCameraError,
          }}
        />
      </div>
    </div>
  );
}
