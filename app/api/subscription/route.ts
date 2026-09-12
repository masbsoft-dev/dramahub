import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getStripe, getPriceIds } from "@/lib/stripe";
import { subscriptionUpdateSchema } from "@/lib/validation";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  return NextResponse.json({ subscription });
}

/** Ajusta a quantidade de telas extras (0-3) de uma assinatura ja ativa. */
export async function PATCH(request: Request) {
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

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription || !subscription.stripeSubscriptionId) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 404 });
  }

  const { extraScreensCount } = parsed.data;
  const stripe = getStripe();
  const { extraScreenPriceId } = getPriceIds();

  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const extraItem = stripeSub.items.data.find((i) => i.price.id === extraScreenPriceId);

  if (extraScreensCount === 0 && extraItem) {
    await stripe.subscriptionItems.del(extraItem.id);
  } else if (extraScreensCount > 0 && extraItem) {
    await stripe.subscriptionItems.update(extraItem.id, { quantity: extraScreensCount });
  } else if (extraScreensCount > 0) {
    await stripe.subscriptionItems.create({
      subscription: subscription.stripeSubscriptionId,
      price: extraScreenPriceId,
      quantity: extraScreensCount,
    });
  }

  const updated = await prisma.subscription.update({
    where: { userId },
    data: { extraScreensCount },
  });

  return NextResponse.json({ subscription: updated });
}
