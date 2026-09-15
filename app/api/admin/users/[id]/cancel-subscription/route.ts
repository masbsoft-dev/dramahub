import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { getStripe, syncSubscriptionFromStripe } from "@/lib/stripe";

export async function POST(_request: Request, ctx: RouteContext<"/api/admin/users/[id]/cancel-subscription">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: userId } = await ctx.params;
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription?.stripeSubscriptionId) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  const stripe = getStripe();
  await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  const status = await syncSubscriptionFromStripe(subscription.stripeSubscriptionId);

  return NextResponse.json({ status });
}
