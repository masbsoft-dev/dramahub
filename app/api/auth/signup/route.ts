import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { fullName, email, cpf, password, deviceFingerprint, deviceName } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        cpf,
        passwordHash,
        registeredDevices: {
          create: {
            fingerprint: deviceFingerprint,
            deviceName,
            lastIp:
              request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
              request.headers.get("x-real-ip") ??
              "unknown",
          },
        },
      },
      select: { id: true, email: true, fullName: true },
    });

    const token = await signSession({ sub: user.id });
    await setSessionCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "email_or_cpf_in_use" }, { status: 409 });
    }
    console.error("[auth/signup]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
