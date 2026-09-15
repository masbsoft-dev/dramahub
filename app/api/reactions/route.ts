import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { dramaReactionSchema, favoriteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = dramaReactionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const { dramaId, type } = parsed.data;

  await prisma.userDramaReaction.upsert({
    where: { userId_dramaId: { userId, dramaId } },
    create: { userId, dramaId, type },
    update: { type },
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

  await prisma.userDramaReaction
    .delete({ where: { userId_dramaId: { userId, dramaId: parsed.data.dramaId } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
