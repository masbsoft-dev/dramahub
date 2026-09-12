import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 60 * 60 * 6; // 6h, cobre uma sessao de maratona

function getSecret(): string {
  const secret = process.env.STREAM_HMAC_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "STREAM_HMAC_SECRET ausente ou fraco. Defina uma env var com pelo menos 16 caracteres."
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export type StreamTokenClaims = {
  userId: string;
  episodeId: string;
  exp: number; // epoch seconds
};

/** Gera um token HMAC assinado para autorizar o player a consumir o proxy de midia. */
export function createStreamToken(userId: string, episodeId: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${episodeId}.${exp}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

/** Valida o token do proxy de midia; retorna as claims se validas, ou null. */
export function verifyStreamToken(token: string, episodeId: string): StreamTokenClaims | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const parts = decoded.split(".");
  if (parts.length !== 4) return null;
  const [userId, tokenEpisodeId, expRaw, signature] = parts;

  if (tokenEpisodeId !== episodeId) return null;

  const payload = `${userId}.${tokenEpisodeId}.${expRaw}`;
  const expected = sign(payload);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const exp = parseInt(expRaw, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  return { userId, episodeId: tokenEpisodeId, exp };
}
