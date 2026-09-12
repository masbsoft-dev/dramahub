import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { heartbeatSchema } from "@/lib/validation";
import { validatePlaybackSession } from "@/lib/redis";

/**
 * Heartbeat de reproducao (secao 2.2 / 6 da especificacao). O player chama
 * esta rota a cada 10s enquanto o video esta tocando; a sessao expira no
 * Redis apos 15s sem heartbeat.
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = heartbeatSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription || subscription.status !== "ACTIVE") {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 403 });
  }

  const { deviceFingerprint } = parsed.data;
  const maxAllowedScreens = 1 + subscription.extraScreensCount;

  const result = await validatePlaybackSession({
    userId,
    deviceId: deviceFingerprint,
    maxAllowedScreens,
  });

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "screen_limit_reached",
        message:
          "Limite de telas atingido. Encerre a reprodução em outro dispositivo ou adicione mais telas.",
        activeStreams: result.activeStreams,
        maxAllowedScreens,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, activeStreams: result.activeStreams, maxAllowedScreens });
}
