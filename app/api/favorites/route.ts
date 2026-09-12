import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { favoriteSchema } from "@/lib/validation";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    include: { drama: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = favoriteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  await prisma.userFavorite.upsert({
    where: { userId_dramaId: { userId, dramaId: parsed.data.dramaId } },
    create: { userId, dramaId: parsed.data.dramaId },
    update: {},
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = favoriteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  await prisma.userFavorite
    .delete({ where: { userId_dramaId: { userId, dramaId: parsed.data.dramaId } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
