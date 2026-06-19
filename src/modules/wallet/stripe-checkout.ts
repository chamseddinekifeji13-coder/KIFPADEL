import { publicEnv } from "@/lib/config/env";
import { getStripeClient, isStripeConfigured, tndToStripeAmount } from "@/lib/stripe/client";

export type StripeCheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

export async function createWalletTopUpCheckoutSession(input: {
  locale: string;
  userId: string;
  userEmail: string | null;
  requestId: string;
  amountTnd: number;
  packageLabel: string;
}): Promise<StripeCheckoutResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Paiement carte non configuré." };
  }

  const stripe = getStripeClient();
  const loc = input.locale === "en" ? "en" : "fr";
  const baseUrl = publicEnv.siteUrl;
  const successUrl = `${baseUrl}/${loc}/profile/wallet?topup=success`;
  const cancelUrl = `${baseUrl}/${loc}/profile/wallet?topup=cancelled`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.userEmail ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "tnd",
            unit_amount: tndToStripeAmount(input.amountTnd),
            product_data: {
              name: `Kifpadel — ${input.packageLabel}`,
              description: "Recharge Jetons KIF",
            },
          },
        },
      ],
      metadata: {
        type: "kif_top_up",
        top_up_request_id: input.requestId,
        user_id: input.userId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      return { ok: false, error: "Session Stripe invalide." };
    }

    return { ok: true, checkoutUrl: session.url };
  } catch (err) {
    console.error("[stripe/checkout] session create failed", err);
    return { ok: false, error: "Impossible de démarrer le paiement Stripe." };
  }
}
