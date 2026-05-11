import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, HelpCircle, LifeBuoy, MessageCircle, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";

type SupportPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SupportPage({ params }: SupportPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await requireUser({ locale, redirectPath: "support" });
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;

  const helpItems = [
    {
      icon: MessageCircle,
      title: labels.supportBookingsTitle,
      description: labels.supportBookingsDescription,
    },
    {
      icon: ShieldCheck,
      title: labels.supportTrustTitle,
      description: labels.supportTrustDescription,
    },
    {
      icon: LifeBuoy,
      title: labels.supportAccountTitle,
      description: labels.supportAccountDescription,
    },
  ];

  return (
    <section className="space-y-4 pb-24">
      <Link
        href={`/${locale}/profile#account-settings`}
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--foreground-muted)] hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {labels.accountBackToProfile}
      </Link>

      <Card className="space-y-2 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{labels.supportPageTitle}</h1>
            <p className="text-sm text-[var(--foreground-muted)]">{labels.supportPageSubtitle}</p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {helpItems.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--gold)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white">{title}</h2>
                <p className="text-sm text-[var(--foreground-muted)]">{description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
