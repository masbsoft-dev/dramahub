import { Redis } from "@upstash/redis";

// A Vercel Marketplace pode expor as credenciais do Upstash com nomes
// diferentes dependendo do produto instalado (upstash-kv usa o prefixo
// KV_*, a integracao "pura" usa UPSTASH_REDIS_REST_*). Resolvemos os dois.
function createRedisClient(): Redis {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Credenciais do Redis ausentes (UPSTASH_REDIS_REST_URL/TOKEN ou KV_REST_API_URL/TOKEN). Rode `vercel env pull` apos provisionar o Upstash."
    );
  }

  return new Redis({ url, token });
}

let _redis: Redis | null = null;
export function getRedis(): Redis {
  if (!_redis) _redis = createRedisClient();
  return _redis;
}

// -------------------------------------------------------------
// Bloqueio concorrente de telas (secao 2.2 / 6 da especificacao)
// -------------------------------------------------------------

const HEARTBEAT_TTL_SECONDS = 15;
const HEARTBEAT_STALE_MS = 15_000;

export type ValidatePlaybackSessionInput = {
  userId: string;
  deviceId: string;
  maxAllowedScreens: number; // 1 (base) + extraScreensCount
};

export type ValidatePlaybackSessionResult = {
  allowed: boolean;
  activeStreams: number;
};

/**
 * Replica 1:1 a funcao de referencia da especificacao (secao 6): registra o
 * heartbeat do dispositivo atual, descarta sessoes com mais de 15s sem
 * heartbeat, e recusa a reproducao se o numero de streams ativos exceder
 * 1 + extraScreensCount.
 */
export async function validatePlaybackSession({
  userId,
  deviceId,
  maxAllowedScreens,
}: ValidatePlaybackSessionInput): Promise<ValidatePlaybackSessionResult> {
  const redis = getRedis();
  const redisKey = `account:${userId}:active_sessions`;

  await redis.hset(redisKey, { [deviceId]: Date.now().toString() });
  await redis.expire(redisKey, HEARTBEAT_TTL_SECONDS);

  const allSessions = (await redis.hgetall<Record<string, string>>(redisKey)) ?? {};
  const now = Date.now();
  let activeCount = 0;

  for (const [devId, timestamp] of Object.entries(allSessions)) {
    if (now - parseInt(timestamp, 10) > HEARTBEAT_STALE_MS) {
      await redis.hdel(redisKey, devId);
    } else {
      activeCount++;
    }
  }

  if (activeCount > maxAllowedScreens) {
    return { allowed: false, activeStreams: activeCount };
  }

  return { allowed: true, activeStreams: activeCount };
}

/** Remove a sessao ativa de um dispositivo (usado ao pausar/sair do player). */
export async function releasePlaybackSession(userId: string, deviceId: string) {
  const redis = getRedis();
  await redis.hdel(`account:${userId}:active_sessions`, deviceId);
}

// -------------------------------------------------------------
// Rate limiting (sliding window simples) — substitui o Kong Gateway
// para as rotas sensiveis (login, signup, heartbeat, ingest).
// -------------------------------------------------------------

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const bucketKey = `ratelimit:${key}`;
  const count = await redis.incr(bucketKey);
  if (count === 1) {
    await redis.expire(bucketKey, windowSeconds);
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
