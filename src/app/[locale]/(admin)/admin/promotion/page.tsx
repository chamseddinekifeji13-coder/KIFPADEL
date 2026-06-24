import { SectionTitle } from "@/components/ui/section-title";
import { AdminPromotionPanel } from "@/components/features/admin/admin-promotion-panel";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";
import { publicEnv } from "@/lib/config/env";
import {
  buildPlatformClubSignInUrl,
  buildPlatformClubSignUpUrl,
  buildPlatformSignUpUrl,
} from "@/lib/referrals/referral-url";
import { buildClubCharterUrl, buildClubPrivacyUrl } from "@/lib/legal/club-legal-urls";
import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPromotionPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const a = dictionary.admin;
  const signUpUrl = buildPlatformSignUpUrl(publicEnv.siteUrl, locale);
  const clubSignUpUrl = buildPlatformClubSignUpUrl(publicEnv.siteUrl, locale);
  const clubSignInUrl = buildPlatformClubSignInUrl(publicEnv.siteUrl, locale);
  const clubCharterUrl = buildClubCharterUrl(publicEnv.siteUrl, locale);
  const clubPrivacyUrl = buildClubPrivacyUrl(publicEnv.siteUrl, locale);
  const panelLabels = {
    previewTitle: a.promotionPreviewTitle,
    copyCta: a.promotionCopyCta,
    whatsappCta: a.promotionWhatsappCta,
    shareCta: a.promotionShareCta,
    copiedToast: a.promotionCopiedToast,
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <SectionTitle
        title={a.promotionPageTitle}
        subtitle={a.promotionPageSubtitle}
        icon={<Megaphone className="h-4 w-4" />}
        titleClassName="text-slate-900"
        subtitleClassName="text-slate-500"
      />

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">
          {a.promotionPlayersSectionTitle}
        </h2>
        <AdminPromotionPanel
          locale={locale}
          signUpUrl={signUpUrl}
          variant="platform"
          labels={{
            ...panelLabels,
            title: a.promotionPanelTitle,
            subtitle: a.promotionPanelSubtitle,
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">
          {a.promotionClubsSectionTitle}
        </h2>
        <AdminPromotionPanel
          locale={locale}
          signUpUrl={clubSignUpUrl}
          secondaryUrl={clubSignInUrl}
          charterUrl={clubCharterUrl}
          privacyUrl={clubPrivacyUrl}
          variant="club"
          labels={{
            ...panelLabels,
            title: a.promotionClubPanelTitle,
            subtitle: a.promotionClubPanelSubtitle,
          }}
        />
        <p className="text-sm text-slate-600 leading-relaxed">{a.promotionClubHint}</p>
      </section>

      <p className="text-sm text-slate-600 leading-relaxed">{a.promotionHint}</p>
    </div>
  );
}
