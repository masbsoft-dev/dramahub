/** Fonte unica dos valores do plano (usada na UI e no provisionamento do Stripe). */
export const BASE_PRICE_BRL = 24.9;
export const EXTRA_SCREEN_PRICE_BRL = 9.9;
export const MAX_EXTRA_SCREENS = 3; // + 1 tela do plano base = 4 telas no total

export function formatBRL(value: number, lang: "pt" | "en" = "pt"): string {
  return lang === "pt"
    ? "R$ " + value.toFixed(2).replace(".", ",")
    : "R$ " + value.toFixed(2);
}
