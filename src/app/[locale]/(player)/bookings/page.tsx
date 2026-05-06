import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { fetchBookingsForPlayer } from "@/modules/bookings/repository";

function statusLabel(status: string, labels: Record<string, string>) {
  const map: Record<string, string> = {
    confirmed: labels.statusConfirmed,
    pending: labels.statusPendingPayment,
    expired: labels.statusExpired,
    cancelled: labels.statusCancelled,
    blocked: labels.statusBlocked,
    completed: labels.statusCompleted,
    no_show: labels.statusNoShow,
  };
  return map[status] ?? status;
}

function paymentLabel(method: string | null | undefined, labels: Record<string, string>) {
  if (method === "online") return labels.paymentOnline;
  if (method === "on_site") return labels.paymentAtClub;
  return labels.paymentUnknown;
}

function statusClasses(status: string) {
  if (status === "confirmed") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  if (status === "pending") return "bg-amber-500/15 text-amber-300 border-amber-400/20";
  if (status === "expired") return "bg-rose-500/15 text-rose-300 border-rose-400/20";
  if (status === "cancelled") return "bg-slate-500/15 text-slate-300 border-slate-400/20";
  if (status === "completed") return "bg-sky-500/15 text-sky-300 border-sky-400/20";
  return "bg-white/10 text-white border-white/20";
}

export default async function PlayerBookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const user = await requireUser({ locale, redirectPath: "bookings" });
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;

  const bookings = await fetchBookingsForPlayer(user.id, 30);
  if (!bookings) redirect(`/${locale}/dashboard`);

  return (
    <section className="space-y-4 pb-24">
      <Card className="space-y-1 border-[var(--border)] bg-[var(--surface)]">
        <h1 className="text-2xl font-black text-white">{labels.bookingsTitle}</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{labels.bookingsSubtitle}</p>
        <p className="text-[11px] text-[var(--foreground-muted)]">{labels.pendingExpiryHint}</p>
      </Card>

      {bookings.length === 0 ? (
        <Card className="space-y-3 border-[var(--border)] bg-[var(--surface)]">
          <p className="text-sm font-bold text-white">{labels.bookingsEmptyTitle}</p>
          <p className="text-xs text-[var(--foreground-muted)]">{labels.bookingsEmptySubtitle}</p>
          <div className="flex gap-2">
            <Link
              href={`/${locale}/book`}
              className="inline-flex h-10 items-center rounded-xl bg-[var(--gold)] px-3 text-xs font-bold text-black hover:bg-[var(--gold-dark)]"
            >
              {labels.bookCourtCta}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex h-10 items-center rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20"
            >
              {labels.backToDashboardCta}
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    {booking.club_name} · {booking.court_label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    {new Date(booking.starts_at).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClasses(booking.status)}`}>
                  {statusLabel(booking.status, labels)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--foreground-muted)]">
                <p>{labels.paymentLabel}: {paymentLabel(booking.payment_method, labels)}</p>
                <p className="text-right">
                  {booking.total_price != null ? `${Number(booking.total_price).toFixed(0)} TND` : "—"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
