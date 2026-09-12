import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { watchProgressSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = watchProgressSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { episodeId, stoppedAtSeconds, isFinished } = parsed.data;

  const progress = await prisma.userWatchProgress.upsert({
    where: { userId_episodeId: { userId, episodeId } },
    create: { userId, episodeId, stoppedAtSeconds, isFinished },
    update: { stoppedAtSeconds, isFinished },
  });

  return NextResponse.json({ progress });
}
