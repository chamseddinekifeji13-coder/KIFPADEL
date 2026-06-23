import { SectionTitle } from "@/components/ui/section-title";
import { AdminPromotionPanel } from "@/components/features/admin/admin-promotion-panel";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";
import { publicEnv } from "@/lib/config/env";
import { buildPlatformSignUpUrl } from "@/lib/referrals/referral-url";
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

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionTitle
        title={a.promotionPageTitle}
        subtitle={a.promotionPageSubtitle}
        icon={<Megaphone className="h-4 w-4" />}
        titleClassName="text-slate-900"
        subtitleClassName="text-slate-500"
      />

      <AdminPromotionPanel
        locale={locale}
        signUpUrl={signUpUrl}
        labels={{
          title: a.promotionPanelTitle,
          subtitle: a.promotionPanelSubtitle,
          previewTitle: a.promotionPreviewTitle,
          copyCta: a.promotionCopyCta,
          whatsappCta: a.promotionWhatsappCta,
          shareCta: a.promotionShareCta,
          copiedToast: a.promotionCopiedToast,
        }}
      />

      <p className="text-sm text-slate-600 leading-relaxed">{a.promotionHint}</p>
    </div>
  );
}
