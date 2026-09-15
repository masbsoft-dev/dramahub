/** Bloqueio basico de SSRF para URLs fornecidas por um admin (defesa em
 * profundidade — mesmo um admin confiavel pode ter a sessao comprometida). */
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?fc00:/i,
  /^\[?fe80:/i,
];

export function isSafeExternalUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return !PRIVATE_HOST_PATTERNS.some((re) => re.test(url.hostname));
}
