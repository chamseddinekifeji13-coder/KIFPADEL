import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquant.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}

/** TND : Stripe utilise les millimes (1 DT = 1000 millimes). */
export function tndToStripeAmount(amountTnd: number): number {
  return Math.round(amountTnd * 1000);
}

export function stripeAmountToTnd(amountMillimes: number): number {
  return Math.round((amountMillimes / 1000) * 100) / 100;
}
