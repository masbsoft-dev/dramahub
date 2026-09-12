import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getStripe, getPriceIds } from "@/lib/stripe";
import { subscriptionUpdateSchema } from "@/lib/validation";

/**
 * Cria (ou reaproveita) o customer e a assinatura recorrente no Stripe para
 * o plano base + telas extras, e devolve o client_secret do pagamento (PIX
 * ou cartao) para o front confirmar com o Stripe.js (Payment Element).
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = subscriptionUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }
  const { extraScreensCount } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (user.subscription?.status === "ACTIVE") {
    return NextResponse.json({ error: "subscription_already_exists" }, { status: 409 });
  }

  const stripe = getStripe();
  const { basePriceId, extraScreenPriceId } = getPriceIds();

  // Assinatura anterior existe mas nunca foi paga (ex.: usuario abandonou o
  // checkout) — cancela no Stripe antes de criar uma nova, para nao acumular
  // assinaturas "incomplete" orfas para a mesma conta.
  if (user.subscription?.stripeSubscriptionId) {
    await stripe.subscriptions
      .cancel(user.subscription.stripeSubscriptionId)
      .catch(() => null);
  }

  let customerId = user.subscription?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
  }

  const items: Stripe.SubscriptionCreateParams.Item[] = [{ price: basePriceId, quantity: 1 }];
  if (extraScreensCount > 0) {
    items.push({ price: extraScreenPriceId, quantity: extraScreensCount });
  }

  const stripeSubscription = await stripe.subscriptions.create({
    customer: customerId,
    items,
    payment_behavior: "default_incomplete",
    payment_settings: {
      payment_method_types: ["card", "pix"],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: { userId: user.id },
  });

  const invoice = stripeSubscription.latest_invoice as Stripe.Invoice | null;
  const clientSecret = invoice?.confirmation_secret?.client_secret;
  if (!clientSecret) {
    console.error("[billing/checkout] sem client_secret", stripeSubscription.id);
    return NextResponse.json({ error: "stripe_setup_error" }, { status: 502 });
  }

  const periodEndSeconds = stripeSubscription.items.data[0]?.current_period_end;
  const currentPeriodEnd = periodEndSeconds
    ? new Date(periodEndSeconds * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: "PAST_DUE",
      extraScreensCount,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId,
      currentPeriodEnd,
    },
    update: {
      status: "PAST_DUE",
      extraScreensCount,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId,
      currentPeriodEnd,
    },
  });

  return NextResponse.json({
    clientSecret,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  });
}
