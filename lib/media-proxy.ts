/**
 * Proxy reverso de midia (secao 4 da especificacao): busca o manifesto/segmento
 * original injetando os headers salvos (Referer/Origin/Cookies da origem) e
 * reescreve as URIs internas do manifesto para apontarem de volta para o
 * nosso proxy, sem nunca expor a origem nem os headers ao cliente.
 */

export type UpstreamHeaders = Record<string, string> | null | undefined;

const UPSTREAM_TIMEOUT_MS = 15_000;
// Um manifesto HLS de texto legitimo (mesmo master + variantes grandes) nao
// deveria passar de baixos MB. Qualquer coisa maior indica que a URL nao e
// um manifesto finito (ex.: um stream continuo sendo lido como texto), e
// bufferizar isso ate o fim so trava a requisicao e derruba o processo.
const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;

// Muitas origens bloqueiam User-Agent generico/vazio (o padrao do fetch do
// Node) como filtro antibot basico. Um UA de navegador comum evita isso por
// padrao; o admin ainda pode sobrescrever via headersJson se a origem exigir
// outra coisa especifica.
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function buildUpstreamHeaders(headersJson: UpstreamHeaders): Record<string, string> {
  const headers: Record<string, string> = { "User-Agent": DEFAULT_USER_AGENT };
  if (headersJson && typeof headersJson === "object") {
    for (const [key, value] of Object.entries(headersJson)) {
      if (typeof value === "string") headers[key] = value;
    }
  }
  return headers;
}

export async function fetchUpstream(url: string, headersJson: UpstreamHeaders, range?: string | null) {
  const headers = buildUpstreamHeaders(headersJson);
  if (range) headers["Range"] = range;

  return fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

/**
 * Le o corpo de uma resposta como texto com um teto de tamanho — em vez de
 * `res.text()`, que bufferiza sem limite e pode travar/estourar memoria se a
 * URL nao for, de fato, um manifesto de texto finito (ex.: um stream
 * continuo). Lanca se exceder o limite.
 */
export async function readTextWithLimit(res: Response, maxBytes = MAX_MANIFEST_BYTES): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`resposta excedeu o limite de ${maxBytes} bytes — nao parece um manifesto de texto`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}

const URI_ATTR_RE = /URI="([^"]+)"/g;

/**
 * Reescreve um manifesto HLS (.m3u8) para que toda URI interna (segmentos
 * .ts/.m4s, sub-playlists de variante, chaves de criptografia, mapas de
 * inicializacao) aponte de volta para o nosso proxy de segmento.
 */
export function rewriteHlsManifest(
  manifestText: string,
  manifestUrl: string,
  toProxyUrl: (absoluteUrl: string) => string
): string {
  if (!manifestText.trimStart().startsWith("#EXTM3U")) {
    throw new Error("conteudo nao comeca com #EXTM3U — nao e um manifesto HLS valido");
  }

  const base = new URL(manifestUrl);

  const resolve = (raw: string) => {
    try {
      return new URL(raw, base).toString();
    } catch {
      return raw;
    }
  };

  return manifestText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        if (trimmed.includes("URI=")) {
          return line.replace(URI_ATTR_RE, (_match, uri: string) => {
            const absolute = resolve(uri);
            return `URI="${toProxyUrl(absolute)}"`;
          });
        }
        return line;
      }

      // Linha de URI pura (segmento .ts/.m4s ou sub-playlist de variante)
      const absolute = resolve(trimmed);
      return toProxyUrl(absolute);
    })
    .join("\n");
}
