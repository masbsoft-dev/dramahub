/**
 * Deteccao automatica da duracao de um episodio a partir da propria URL,
 * para o admin nao precisar calcular/informar isso manualmente. HLS: soma os
 * #EXTINF de todos os segmentos do manifesto (seguindo a primeira variante,
 * se for um master playlist). MP4: le a caixa moov/mvhd (ISO-BMFF) dos
 * primeiros bytes do arquivo via Range request — cobre o caso comum de
 * arquivos "faststart" (moov no inicio); se nao encontrar nesse trecho,
 * desiste (sem baixar o arquivo inteiro) e o admin informa manualmente.
 */
import { fetchUpstream, readTextWithLimit, type UpstreamHeaders } from "./media-proxy";

const MP4_PROBE_BYTES = 5 * 1024 * 1024;

async function readFirstBytes(res: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf).slice(0, maxBytes);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});

  const merged = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = merged.length - offset;
    if (remaining <= 0) break;
    const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
    merged.set(slice, offset);
    offset += slice.length;
  }
  return merged;
}

function findBox(
  view: DataView,
  start: number,
  end: number,
  targetType: string
): { end: number; payloadStart: number } | null {
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const hi = view.getUint32(offset + 8);
      const lo = view.getUint32(offset + 12);
      size = hi * 2 ** 32 + lo;
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize) break; // caixa invalida — evita loop infinito

    if (type === targetType) {
      return { end: offset + size, payloadStart: offset + headerSize };
    }
    offset += size;
  }
  return null;
}

/** Le a duracao (segundos) da caixa mvhd dentro de moov, se ambas couberem no buffer. */
export function parseMp4Duration(buf: ArrayBufferLike): number | null {
  const view = new DataView(buf);
  const moov = findBox(view, 0, buf.byteLength, "moov");
  if (!moov) return null;
  const mvhd = findBox(view, moov.payloadStart, moov.end, "mvhd");
  if (!mvhd) return null;

  const p = mvhd.payloadStart;
  if (p + 4 > buf.byteLength) return null;
  const version = view.getUint8(p);

  let timescale: number;
  let duration: number;
  if (version === 1) {
    if (p + 32 > buf.byteLength) return null;
    timescale = view.getUint32(p + 20);
    duration = Number(view.getBigUint64(p + 24));
  } else {
    if (p + 20 > buf.byteLength) return null;
    timescale = view.getUint32(p + 12);
    duration = view.getUint32(p + 16);
  }

  if (!timescale) return null;
  return Math.round(duration / timescale);
}

export async function probeMp4Duration(
  manifestUrl: string,
  headersJson: UpstreamHeaders
): Promise<number | null> {
  let res: Response;
  try {
    res = await fetchUpstream(manifestUrl, headersJson, `bytes=0-${MP4_PROBE_BYTES - 1}`);
  } catch {
    return null;
  }
  if (!res.ok && res.status !== 206) return null;

  const bytes = await readFirstBytes(res, MP4_PROBE_BYTES);
  return parseMp4Duration(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

const EXTINF_RE = /#EXTINF:\s*([\d.]+)/g;

export async function probeHlsDuration(
  manifestUrl: string,
  headersJson: UpstreamHeaders
): Promise<number | null> {
  let text: string;
  try {
    const res = await fetchUpstream(manifestUrl, headersJson);
    if (!res.ok) return null;
    text = await readTextWithLimit(res);
  } catch {
    return null;
  }
  if (!text.trimStart().startsWith("#EXTM3U")) return null;

  if (text.includes("#EXT-X-STREAM-INF")) {
    // Master playlist — segue a primeira variante para achar os segmentos.
    const lines = text.split("\n").map((l) => l.trim());
    const idx = lines.findIndex((l) => l.startsWith("#EXT-X-STREAM-INF"));
    const variantLine = lines.slice(idx + 1).find((l) => l && !l.startsWith("#"));
    if (!variantLine) return null;

    let variantUrl: string;
    try {
      variantUrl = new URL(variantLine, manifestUrl).toString();
    } catch {
      return null;
    }

    try {
      const res2 = await fetchUpstream(variantUrl, headersJson);
      if (!res2.ok) return null;
      text = await readTextWithLimit(res2);
    } catch {
      return null;
    }
  }

  const matches = [...text.matchAll(EXTINF_RE)];
  if (matches.length === 0) return null;
  const total = matches.reduce((sum, m) => sum + parseFloat(m[1]), 0);
  return Math.round(total);
}
