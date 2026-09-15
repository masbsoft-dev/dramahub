import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminSeasonSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/dramas/[id]/seasons">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: dramaId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminSeasonSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 422 });
  }

  const { _max } = await prisma.season.aggregate({ where: { dramaId }, _max: { seasonNumber: true } });
  const seasonNumber = (_max.seasonNumber ?? 0) + 1;

  try {
    const season = await prisma.season.create({ data: { ...parsed.data, dramaId, seasonNumber } });
    return NextResponse.json({ season }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create_failed" }, { status: 400 });
  }
}
