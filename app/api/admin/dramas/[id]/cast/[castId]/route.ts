import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminCastMemberSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/cast/[castId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { castId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminCastMemberSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 422 });
  }

  const castMember = await prisma.castMember
    .update({ where: { id: castId }, data: parsed.data })
    .catch(() => null);

  if (!castMember) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ castMember });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/cast/[castId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { castId } = await ctx.params;
  await prisma.castMember.delete({ where: { id: castId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
