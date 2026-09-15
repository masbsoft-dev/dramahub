import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminCastMemberSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/dramas/[id]/cast">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: dramaId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminCastMemberSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 422 });
  }

  try {
    const castMember = await prisma.castMember.create({ data: { ...parsed.data, dramaId } });
    return NextResponse.json({ castMember }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create_failed" }, { status: 400 });
  }
}
