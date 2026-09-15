import { parse } from "iptv-playlist-parser";

/**
 * Parser generico de playlists M3U/M3U8 (formato Xtream/IPTV padrao). Nao
 * assume nenhuma fonte especifica — funciona com qualquer playlist que o
 * operador da instancia tenha direito de importar.
 */

export type NormalizedPlaylistItem = {
  name: string;
  groupTitle: string | null;
  logoUrl: string | null;
  streamUrl: string;
  tvgId: string | null;
};

export function parsePlaylistText(text: string): NormalizedPlaylistItem[] {
  const { items } = parse(text);
  return items
    .filter((item) => item.url && item.url.trim())
    .map((item) => ({
      name: item.name?.trim() || item.url,
      groupTitle: item.group?.title?.trim() || null,
      logoUrl: item.tvg?.logo?.trim() || null,
      streamUrl: item.url.trim(),
      tvgId: item.tvg?.id?.trim() || null,
    }));
}

const MOVIE_KEYWORDS = /\b(filme|filmes|movie|movies|cinema)\b/i;
// Inclui "dorama(s)"/"drama(s)" e as variantes k-drama/c-drama — categorias
// muito comuns em listas IPTV reais para o tipo de conteudo desta plataforma
// (grupos como "Doramas", "K-Drama", "Cdrama" nao contêm "série"/"temporada"
// e cairiam em UNKNOWN sem isso, ficando escondidos da revisao no admin).
const SERIES_KEYWORDS =
  /\b(serie|séries|series|s[eé]rie|temporada|season|doramas?|dramas?|[kc]-?dramas?)\b/i;
const CHANNEL_KEYWORDS = /\b(canal|canais|channel|channels|tv|ao vivo|live)\b/i;

export type PlaylistKind = "CHANNEL" | "MOVIE" | "SERIES" | "UNKNOWN";

/** Heuristica por palavras-chave no group-title/nome — editavel na revisao,
 * nunca definitiva (playlists variam muito de provedor para provedor). */
export function classifyKind(item: Pick<NormalizedPlaylistItem, "name" | "groupTitle">): PlaylistKind {
  const haystack = `${item.groupTitle ?? ""} ${item.name}`;
  if (SERIES_TITLE_RE.test(item.name) || SERIES_KEYWORDS.test(haystack)) return "SERIES";
  if (MOVIE_KEYWORDS.test(haystack)) return "MOVIE";
  if (CHANNEL_KEYWORDS.test(haystack)) return "CHANNEL";
  return "UNKNOWN";
}

/** Xtream/IPTV costuma servir VOD (filme/serie) como arquivo unico .mp4 e
 * canal/live como manifesto HLS — deduz pela extensao da URL do stream. */
export function guessFormat(streamUrl: string): "HLS" | "MP4" {
  const path = streamUrl.split(/[?#]/)[0];
  return /\.mp4$/i.test(path) ? "MP4" : "HLS";
}

// Padroes comuns de episodio no titulo: "S01E02", "1x02", "Temporada 1 Episodio 2"
const SERIES_TITLE_RE = /\bS(\d{1,2})[\s._-]*E(\d{1,3})\b|\b(\d{1,2})x(\d{1,3})\b|temporada\s*\d+.*epis[oó]dio\s*\d+/i;

export type SeriesEpisodeInfo = {
  baseTitle: string;
  season: number | null;
  episode: number | null;
};

/** Extrai (quando possivel) titulo-base + temporada/episodio de um nome de
 * item, para agrupar entradas de uma mesma serie na revisao. Best-effort. */
export function parseSeriesEpisode(name: string): SeriesEpisodeInfo {
  const match = SERIES_TITLE_RE.exec(name);
  if (!match) return { baseTitle: name.trim(), season: null, episode: null };

  const season = match[1] ?? match[3];
  const episode = match[2] ?? match[4];
  const baseTitle = name.slice(0, match.index).trim().replace(/[-–—:|]+$/, "").trim();

  return {
    baseTitle: baseTitle || name.trim(),
    season: season ? parseInt(season, 10) : null,
    episode: episode ? parseInt(episode, 10) : null,
  };
}
