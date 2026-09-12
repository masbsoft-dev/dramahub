import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { verifyStreamToken } from "@/lib/stream-token";
import { fetchUpstream, rewriteHlsManifest } from "@/lib/media-proxy";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/stream/[episodeId]/master.m3u8">
) {
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

  const upstreamRes = await fetchUpstream(
    episode.manifestUrl,
    episode.headersJson as Record<string, string> | null
  );
  if (!upstreamRes.ok) {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  const manifestText = await upstreamRes.text();
  const rewritten = rewriteHlsManifest(manifestText, episode.manifestUrl, (absoluteUrl) => {
    const proxyUrl = new URL(`/api/stream/${episodeId}/segment`, url.origin);
    proxyUrl.searchParams.set("u", Buffer.from(absoluteUrl).toString("base64url"));
    proxyUrl.searchParams.set("token", token!);
    return proxyUrl.toString();
  });

  return new NextResponse(rewritten, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-store",
    },
  });
}
