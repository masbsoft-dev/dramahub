/**
 * Provisiona (de forma idempotente) o produto e os precos recorrentes do
 * Stripe usados pela assinatura Dramahub: plano base (R$ 24,90/mes) e tela
 * extra (R$ 9,90/mes cada, ate 3). Grava os IDs resultantes em .env.local.
 *
 * Uso: npx dotenv -e .env.local -- npx tsx scripts/stripe-setup.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import Stripe from "stripe";
import { BASE_PRICE_BRL, EXTRA_SCREEN_PRICE_BRL } from "../lib/pricing";

const BASE_LOOKUP_KEY = "dramahub_base_1080p";
const EXTRA_LOOKUP_KEY = "dramahub_extra_screen";
const BASE_PRICE_BRL_CENTS = Math.round(BASE_PRICE_BRL * 100);
const EXTRA_PRICE_BRL_CENTS = Math.round(EXTRA_SCREEN_PRICE_BRL * 100);

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY ausente. Rode via `dotenv -e .env.local` apos provisionar o Stripe.");
    process.exit(1);
  }
  const stripe = new Stripe(secretKey);

  let product = (await stripe.products.list({ limit: 100 })).data.find(
    (p) => p.metadata.app === "dramahub"
  );
  if (!product) {
    product = await stripe.products.create({
      name: "Dramahub — Plano Full HD",
      description: "Assinatura SVOD 1080p com add-on de telas simultaneas extras.",
      metadata: { app: "dramahub" },
    });
    console.log("Produto criado:", product.id);
  } else {
    console.log("Produto ja existia:", product.id);
  }

  async function ensurePrice(lookupKey: string, unitAmount: number, nickname: string) {
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    if (existing.data[0]) {
      console.log(`Preco '${lookupKey}' ja existia:`, existing.data[0].id);
      return existing.data[0].id;
    }
    const price = await stripe.prices.create({
      product: product!.id,
      currency: "brl",
      unit_amount: unitAmount,
      recurring: { interval: "month" },
      lookup_key: lookupKey,
      nickname,
    });
    console.log(`Preco '${lookupKey}' criado:`, price.id);
    return price.id;
  }

  const basePriceId = await ensurePrice(BASE_LOOKUP_KEY, BASE_PRICE_BRL_CENTS, "Plano Full HD (base)");
  const extraScreenPriceId = await ensurePrice(EXTRA_LOOKUP_KEY, EXTRA_PRICE_BRL_CENTS, "Tela extra");

  const envPath = resolve(process.cwd(), ".env.local");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  function upsertEnvVar(key: string, value: string) {
    const line = `${key}="${value}"`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content = content.trimEnd() + `\n${line}\n`;
    }
  }

  upsertEnvVar("STRIPE_PRICE_BASE", basePriceId);
  upsertEnvVar("STRIPE_PRICE_EXTRA_SCREEN", extraScreenPriceId);

  writeFileSync(envPath, content);
  console.log("\n.env.local atualizado com STRIPE_PRICE_BASE e STRIPE_PRICE_EXTRA_SCREEN.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
