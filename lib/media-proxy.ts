/**
 * Proxy reverso de midia (secao 4 da especificacao): busca o manifesto/segmento
 * original injetando os headers salvos (Referer/Origin/Cookies da origem) e
 * reescreve as URIs internas do manifesto para apontarem de volta para o
 * nosso proxy, sem nunca expor a origem nem os headers ao cliente.
 */

export type UpstreamHeaders = Record<string, string> | null | undefined;

function buildUpstreamHeaders(headersJson: UpstreamHeaders): Record<string, string> {
  const headers: Record<string, string> = {};
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

  return fetch(url, { headers, redirect: "follow" });
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
