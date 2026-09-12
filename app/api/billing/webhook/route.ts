import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

async function syncFromStripeSubscription(stripeSubscriptionId: string) {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const status =
    sub.status === "active" || sub.status === "trialing"
      ? "ACTIVE"
      : sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired"
        ? "CANCELED"
        : "PAST_DUE";

  const periodEndSeconds = sub.items.data[0]?.current_period_end;
  const currentPeriodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000) : undefined;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: {
      status,
      ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
    },
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET ausente");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[billing/webhook] assinatura invalida", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.parent?.subscription_details?.subscription?.id;
        if (subscriptionId) await syncFromStripeSubscription(subscriptionId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncFromStripeSubscription(sub.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[billing/webhook] erro processando evento", event.type, err);
    return NextResponse.json({ error: "processing_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
