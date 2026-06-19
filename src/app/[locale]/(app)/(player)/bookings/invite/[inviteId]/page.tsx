import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BookingInviteAcceptForm } from "@/components/features/bookings/booking-invite-accept-form";
import { fetchBookingInvitePublic } from "@/modules/bookings/split-payment-repository";
import { fetchKifWalletBalance } from "@/modules/wallet/repository";
import { reliabilityFromTrustScore } from "@/domain/rules/trust";

type Props = {
  params: Promise<{ locale: string; inviteId: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function BookingInvitePage({ params, searchParams }: Props) {
  const { locale, inviteId } = await params;
  const { t: token } = await searchParams;

  if (!isLocale(locale)) notFound();
  if (!token?.trim()) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <p className="text-sm text-rose-300">Lien incomplet — le token d&apos;invitation est manquant.</p>
      </div>
    );
  }

  const invite = await fetchBookingInvitePublic(inviteId);
  if (!invite) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/${locale}/bookings/invite/${inviteId}?t=${encodeURIComponent(token)}`;
    redirect(`/${locale}/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  const walletBalance = await fetchKifWalletBalance(user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .maybeSingle();

  const trustScore = Number((profile as { trust_score?: number } | null)?.trust_score ?? 70);
  const reliability = reliabilityFromTrustScore(trustScore);
  const isRestricted = reliability === "restricted" || reliability === "blacklisted";

  return (
    <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto pb-20">
      <header className="space-y-2">
        <h1 className="text-xl font-bold text-white">
          {locale === "en" ? "Join this slot" : "Rejoindre ce créneau"}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {invite.clubName} · Place {invite.seatIndex}
        </p>
        {invite.startsAt ? (
          <p className="text-sm text-white/80">
            {new Date(invite.startsAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
          </p>
        ) : null}
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
        <BookingInviteAcceptForm
          locale={locale}
          invite={invite}
          token={token.trim()}
          walletBalance={walletBalance}
          isRestricted={isRestricted}
        />
      </section>

      <p className="text-[10px] text-[var(--foreground-muted)] text-center">
        <Link href={`/${locale}/book`} className="text-[var(--gold)] hover:underline">
          Retour à la réservation
        </Link>
      </p>
    </div>
  );
}
