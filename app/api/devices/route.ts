import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { deviceDisconnectSchema } from "@/lib/validation";
import { releasePlaybackSession } from "@/lib/redis";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const devices = await prisma.device.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });
  return NextResponse.json({ devices });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = deviceDisconnectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const device = await prisma.device.findUnique({ where: { id: parsed.data.deviceId } });
  if (!device || device.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await releasePlaybackSession(userId, device.fingerprint).catch(() => null);
  await prisma.device.delete({ where: { id: device.id } });

  return NextResponse.json({ ok: true });
}
