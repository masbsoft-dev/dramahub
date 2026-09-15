import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { verifyStreamToken } from "@/lib/stream-token";
import { fetchUpstream } from "@/lib/media-proxy";

/**
 * Proxy de arquivo unico (MP4): sem manifesto/segmentos para reescrever —
 * so repassa os bytes da origem (com os headers injetados) respeitando
 * `Range` para permitir seek/scrubbing no player.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/stream/[episodeId]/file.mp4">) {
  const { episodeId } = await ctx.params;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const claims = token ? verifyStreamToken(token, episodeId) : null;
  if (!claims || claims.userId !== userId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription || subscription.status !== "ACTIVE") {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 403 });
  }

  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (episode.format !== "MP4") {
    return NextResponse.json({ error: "wrong_format" }, { status: 400 });
  }

  const range = request.headers.get("range");
  let upstreamRes: Response;
  try {
    upstreamRes = await fetchUpstream(
      episode.manifestUrl,
      episode.headersJson as Record<string, string> | null,
      range
    );
  } catch (err) {
    console.error("[stream/file.mp4] falha ao buscar upstream", err);
    return NextResponse.json({ error: "upstream_timeout_or_error" }, { status: 502 });
  }

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  // Algumas origens respondem 200/206 mas entregam uma pagina de erro/HTML
  // em vez do arquivo de video (URL errada, link expirado, redirecionado
  // para uma pagina em vez do arquivo direto). Rejeita cedo em vez de
  // repassar HTML como se fosse video — o player so falharia silenciosamente.
  const upstreamContentType = upstreamRes.headers.get("content-type") ?? "";
  const looksLikeVideo =
    upstreamContentType.startsWith("video/") ||
    upstreamContentType === "application/octet-stream" ||
    upstreamContentType === "binary/octet-stream";
  if (!looksLikeVideo) {
    console.error(
      "[stream/file.mp4] origem nao devolveu video (content-type:",
      upstreamContentType || "ausente",
      ") — manifestUrl:",
      episode.manifestUrl
    );
    return NextResponse.json(
      { error: "upstream_not_video", contentType: upstreamContentType || null },
      { status: 502 }
    );
  }

  const headers = new Headers();
  const passthroughHeaders = ["content-type", "content-length", "content-range", "accept-ranges"];
  for (const h of passthroughHeaders) {
    const value = upstreamRes.headers.get(h);
    if (value) headers.set(h, value);
  }
  if (!headers.has("content-type")) headers.set("content-type", "video/mp4");
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  headers.set("Cache-Control", "no-store");

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  });
}
