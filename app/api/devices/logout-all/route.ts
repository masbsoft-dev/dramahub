import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, clearSessionCookie } from "@/lib/auth";
import { releasePlaybackSession } from "@/lib/redis";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const devices = await prisma.device.findMany({ where: { userId } });
  await Promise.all(devices.map((d) => releasePlaybackSession(userId, d.fingerprint).catch(() => null)));
  await prisma.device.deleteMany({ where: { userId } });
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
