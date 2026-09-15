import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { playlistImportItemUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/import/[importId]/items/[itemId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { importId, itemId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = playlistImportItemUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const existing = await prisma.playlistImportItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.importId !== importId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const item = await prisma.playlistImportItem.update({
    where: { id: itemId },
    data: parsed.data,
  });

  return NextResponse.json({ item });
}
