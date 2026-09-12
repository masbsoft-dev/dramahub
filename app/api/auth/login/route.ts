import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

const MAX_DEVICES = 5;

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { email, password, deviceFingerprint, deviceName } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // Sempre roda o compare mesmo sem usuario, para nao vazar timing de existencia de conta.
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin");

  if (!user || !passwordOk) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const existingDevice = await prisma.device.findUnique({
    where: { userId_fingerprint: { userId: user.id, fingerprint: deviceFingerprint } },
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (existingDevice) {
    await prisma.device.update({
      where: { id: existingDevice.id },
      data: { lastIp: ip, deviceName },
    });
  } else {
    const deviceCount = await prisma.device.count({ where: { userId: user.id } });
    if (deviceCount >= MAX_DEVICES) {
      return NextResponse.json({ error: "device_limit_reached" }, { status: 403 });
    }
    await prisma.device.create({
      data: { userId: user.id, fingerprint: deviceFingerprint, deviceName, lastIp: ip },
    });
  }

  const token = await signSession({ sub: user.id });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
