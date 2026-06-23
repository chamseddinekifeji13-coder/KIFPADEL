import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BookingInviteAcceptForm } from "@/components/features/bookings/booking-invite-accept-form";
import {
  fetchBookingInvitePublic,
  fetchProfilePaymentGateFields,
} from "@/modules/bookings/split-payment-repository";
import { fetchKifWalletBalance } from "@/modules/wallet/repository";
import { clubService } from "@/modules/clubs/service";
import { isRacketRentalOfferedByClub } from "@/modules/bookings/racket-rental-pipeline";
import {
  isConfirmedPlayer,
  isNewAccountForGates,
  mustUseWalletForBooking,
} from "@/modules/compliance/new-account-gates";

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
  const [guestProfile, inviterProfile] = await Promise.all([
    fetchProfilePaymentGateFields(user.id),
    fetchProfilePaymentGateFields(invite.invitedByUserId),
  ]);

  const inviterIsConfirmed = inviterProfile ? isConfirmedPlayer(inviterProfile) : false;
  const invitedByClub = invite.inviteSource === "club";
  const isRestricted = mustUseWalletForBooking(
    {
      trust_score: guestProfile?.trust_score ?? 70,
      created_at: guestProfile?.created_at,
      phone_verified_at: guestProfile?.phone_verified_at,
    },
    { inviterIsConfirmed, invitedByClub },
  );

  let racketUnitPrice = 0;
  try {
    const supabaseForClub = await createSupabaseServerClient();
    const { data: bookingRow } = await supabaseForClub
      .from("bookings")
      .select("club_id")
      .eq("id", invite.bookingId)
      .maybeSingle();
    if (bookingRow?.club_id) {
      const club = await clubService.getClubDetails(String(bookingRow.club_id)).catch(() => null);
      if (club && isRacketRentalOfferedByClub(club)) {
        racketUnitPrice = Number(club.racket_rental_price_per_unit ?? 0);
      }
    }
  } catch {
  }

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
        {invitedByClub ? (
          <p className="text-xs text-emerald-300/90">
            {locale === "en"
              ? "Invitation from the club — you may pay at the club (no KIF tokens required)."
              : "Invitation du club — vous pouvez payer sur place (sans Jetons KIF)."}
          </p>
        ) : inviterIsConfirmed && guestProfile && isNewAccountForGates(guestProfile) ? (
          <p className="text-xs text-emerald-300/90">
            {locale === "en"
              ? "Your partner is a verified player — you may pay at the club."
              : "Votre partenaire est un joueur confirmé — vous pouvez payer sur place."}
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
          defaultPaymentMethod={invitedByClub ? "on_site" : undefined}
          racketUnitPrice={racketUnitPrice}
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
