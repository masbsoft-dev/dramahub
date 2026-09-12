import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY ausente. Provisione o Stripe via Vercel Marketplace e rode `vercel env pull`."
    );
  }
  _stripe = new Stripe(key);
  return _stripe;
}

/**
 * IDs dos precos recorrentes no Stripe (criados uma vez via dashboard/API e
 * fixados em env vars — ver docs/design-reference e README para o passo a
 * passo de criacao do produto "Plano Full HD" + "Tela extra").
 */
export function getPriceIds() {
  const basePriceId = process.env.STRIPE_PRICE_BASE;
  const extraScreenPriceId = process.env.STRIPE_PRICE_EXTRA_SCREEN;
  if (!basePriceId || !extraScreenPriceId) {
    throw new Error(
      "STRIPE_PRICE_BASE / STRIPE_PRICE_EXTRA_SCREEN ausentes nas env vars."
    );
  }
  return { basePriceId, extraScreenPriceId };
}
