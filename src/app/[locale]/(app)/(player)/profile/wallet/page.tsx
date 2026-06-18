import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchKifWalletSummary } from "@/modules/wallet/repository";
import { formatKifAmount, transactionTypeLabel } from "@/domain/rules/kif-wallet";
import { KifTopUpPanel } from "@/components/features/wallet/kif-top-up-panel";
import { Card } from "@/components/ui/card";

type WalletPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WalletPage({ params }: WalletPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/sign-in?next=/${locale}/profile/wallet`);

  const summary = await fetchKifWalletSummary(user.id);

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto pb-24">
      <Link href={`/${locale}/profile`} className="text-sm text-sky-400 font-medium">
        ← {labels.profileTitle}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-gold" />
          <h1 className="text-2xl font-bold text-white">{labels.kifWalletTitle}</h1>
        </div>
        <p className="text-sm text-white/60">{labels.kifWalletSubtitle}</p>
      </header>

      <Card className="p-5 bg-gold/10 border-gold/30 space-y-1">
        <p className="text-[10px] uppercase font-bold text-gold/80 tracking-wider">
          {labels.kifWalletBalanceLabel}
        </p>
        <p className="text-3xl font-black text-gold">{formatKifAmount(summary.balance)}</p>
        <p className="text-xs text-white/50">{labels.kifWalletBalanceHint}</p>
      </Card>

      <KifTopUpPanel
        locale={locale}
        packages={summary.packages}
        labels={{
          title: labels.kifWalletTopUpTitle,
          subtitle: labels.kifWalletTopUpSubtitle,
          buyCta: labels.kifWalletTopUpCta,
          buying: labels.kifWalletTopUpBuying,
          success: labels.kifWalletTopUpSuccess,
          pendingGateway: labels.kifWalletTopUpPending,
          error: labels.kifWalletTopUpError,
          bonusLabel: labels.kifWalletBonusLabel,
        }}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white px-1">{labels.kifWalletHistoryTitle}</h2>
        {summary.transactions.length === 0 ? (
          <Card className="p-4 text-sm text-white/60 border-white/10 bg-surface-elevated">
            {labels.kifWalletHistoryEmpty}
          </Card>
        ) : (
          <div className="space-y-2">
            {summary.transactions.map((tx) => (
              <Card
                key={tx.id}
                className="p-4 border-white/10 bg-surface-elevated flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {tx.description || transactionTypeLabel(tx.type, locale as "fr" | "en")}
                  </p>
                  <p className="text-[11px] text-white/50">
                    {new Date(tx.createdAt).toLocaleString(
                      locale === "en" ? "en-GB" : "fr-FR",
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-black ${
                      tx.amount >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {formatKifAmount(tx.amount)}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {formatKifAmount(tx.balanceAfter)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
