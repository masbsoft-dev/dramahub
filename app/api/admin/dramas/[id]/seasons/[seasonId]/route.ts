import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminSeasonSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/seasons/[seasonId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { seasonId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminSeasonSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 422 });
  }

  const season = await prisma.season
    .update({ where: { id: seasonId }, data: parsed.data })
    .catch(() => null);

  if (!season) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ season });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/seasons/[seasonId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { seasonId } = await ctx.params;
  // onDelete: Cascade no schema ja remove os episodios/legendas da temporada.
  await prisma.season.delete({ where: { id: seasonId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
