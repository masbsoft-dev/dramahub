import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminGenreSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/genres/[id]">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminGenreSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const genre = await prisma.genre.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!genre) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ genre });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/genres/[id]">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await prisma.genre.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
