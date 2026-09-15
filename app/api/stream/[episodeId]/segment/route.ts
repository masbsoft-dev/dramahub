import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { verifyStreamToken } from "@/lib/stream-token";
import { fetchUpstream, rewriteHlsManifest, readTextWithLimit } from "@/lib/media-proxy";

function isPlaylist(targetUrl: string, contentType: string | null): boolean {
  if (contentType?.includes("mpegurl")) return true;
  return /\.m3u8(\?|$)/i.test(targetUrl);
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/stream/[episodeId]/segment">
) {
  const { episodeId } = await ctx.params;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const encodedTarget = url.searchParams.get("u");
  if (!token || !encodedTarget) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const claims = verifyStreamToken(token, episodeId);
  if (!claims || claims.userId !== userId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }

  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let targetUrl: string;
  try {
    targetUrl = Buffer.from(encodedTarget, "base64url").toString("utf8");
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // So permite proxear segmentos que vivem no mesmo host do manifesto original,
  // para o proxy nao virar um relay generico de qualquer URL.
  const manifestHost = new URL(episode.manifestUrl).host;
  if (new URL(targetUrl).host !== manifestHost) {
    return NextResponse.json({ error: "target_not_allowed" }, { status: 403 });
  }

  const range = request.headers.get("range");
  let upstreamRes: Response;
  try {
    upstreamRes = await fetchUpstream(
      targetUrl,
      episode.headersJson as Record<string, string> | null,
      range
    );
  } catch (err) {
    console.error("[stream/segment] falha ao buscar upstream", err);
    return NextResponse.json({ error: "upstream_timeout_or_error" }, { status: 502 });
  }

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  // Sub-playlists (variant playlists de um master .m3u8) tambem precisam ter
  // suas URIs internas reescritas para o proxy — senao os segmentos que elas
  // referenciam (fileSequenceN.ts etc.) vazam a URL de origem para o player.
  if (isPlaylist(targetUrl, upstreamRes.headers.get("content-type"))) {
    try {
      const manifestText = await readTextWithLimit(upstreamRes);
      const rewritten = rewriteHlsManifest(manifestText, targetUrl, (absoluteUrl) => {
        const proxyUrl = new URL(url.pathname, url.origin);
        proxyUrl.searchParams.set("u", Buffer.from(absoluteUrl).toString("base64url"));
        proxyUrl.searchParams.set("token", token);
        return proxyUrl.toString();
      });
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[stream/segment] sub-playlist invalida ou grande demais", targetUrl, err);
      return NextResponse.json({ error: "invalid_manifest" }, { status: 502 });
    }
  }

  const headers = new Headers();
  const passthroughHeaders = ["content-type", "content-length", "content-range", "accept-ranges"];
  for (const h of passthroughHeaders) {
    const value = upstreamRes.headers.get(h);
    if (value) headers.set(h, value);
  }
  headers.set("Cache-Control", "no-store");

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  });
}
