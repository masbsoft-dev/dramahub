import type { CSSProperties } from "react";

/** posterUrl/bannerUrl guardam ou uma URL de imagem real, ou (no catalogo
 * semente, sem artes finais) um gradiente CSS usado como placeholder — igual
 * ao protótipo, que tambem usa apenas gradientes. */
export function isCssGradient(value: string): boolean {
  return value.trim().startsWith("linear-gradient(") || value.trim().startsWith("radial-gradient(");
}

export function posterStyle(value: string): CSSProperties {
  return isCssGradient(value)
    ? { backgroundImage: value }
    : { backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center" };
}

/** Sobrepoe um gradiente de legibilidade (escurecendo a esquerda, por ex.)
 * a um poster/banner, seja ele gradiente ou imagem real. */
export function bannerStyleWithOverlay(overlayGradient: string, value: string): CSSProperties {
  const base = posterStyle(value);
  return {
    ...base,
    backgroundImage: `${overlayGradient}, ${base.backgroundImage}`,
    backgroundSize: base.backgroundSize ? `100% 100%, ${base.backgroundSize}` : undefined,
    backgroundPosition: base.backgroundPosition ? `center, ${base.backgroundPosition}` : undefined,
  };
}
