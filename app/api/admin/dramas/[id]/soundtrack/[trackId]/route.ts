import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminSoundtrackTrackSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/soundtrack/[trackId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { trackId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminSoundtrackTrackSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 422 });
  }

  const track = await prisma.soundtrackTrack
    .update({ where: { id: trackId }, data: parsed.data })
    .catch(() => null);

  if (!track) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ track });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/soundtrack/[trackId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { trackId } = await ctx.params;
  await prisma.soundtrackTrack.delete({ where: { id: trackId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
