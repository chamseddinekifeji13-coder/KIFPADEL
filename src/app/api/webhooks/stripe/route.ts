import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/client";

export const runtime = "nodejs";

async function markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (!error) return true;

  if (error.code === "23505") {
    return false;
  }

  console.error("[stripe/webhook] idempotency insert failed", error.message);
  throw error;
}

async function completeTopUpFromSession(session: Stripe.Checkout.Session): Promise<void> {
  const requestId = session.metadata?.top_up_request_id?.trim();
  if (!requestId) {
    console.warn("[stripe/webhook] checkout.session.completed sans top_up_request_id");
    return;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("kif_complete_top_up", {
    p_request_id: requestId,
    p_provider: "stripe",
    p_external_reference: session.id,
  });

  if (error) {
    console.error("[stripe/webhook] kif_complete_top_up failed", error.message);
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as { ok?: boolean; error_message?: string } | null;
  if (!row?.ok) {
    console.error("[stripe/webhook] top-up not completed", row?.error_message);
    throw new Error(row?.error_message ?? "TOP_UP_FAILED");
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET manquant." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature invalid", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const isNew = await markEventProcessed(event.id, event.type);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid" && session.metadata?.type === "kif_top_up") {
          await completeTopUpFromSession(session);
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "kif_top_up") {
          await completeTopUpFromSession(session);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", event.type, err);
    return NextResponse.json({ error: "Traitement échoué." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
