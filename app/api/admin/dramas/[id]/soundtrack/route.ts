import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminSoundtrackTrackSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/dramas/[id]/soundtrack">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: dramaId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminSoundtrackTrackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 422 });
  }

  try {
    const track = await prisma.soundtrackTrack.create({ data: { ...parsed.data, dramaId } });
    return NextResponse.json({ track }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create_failed" }, { status: 400 });
  }
}
