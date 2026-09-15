import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminDramaSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/dramas/[id]">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminDramaSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { genreIds, ...data } = parsed.data;

  const drama = await prisma.drama
    .update({
      where: { id },
      data: {
        ...data,
        ...(genreIds
          ? {
              genres: {
                deleteMany: {},
                create: genreIds.map((genreId) => ({ genreId })),
              },
            }
          : {}),
      },
    })
    .catch(() => null);

  if (!drama) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ drama });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/dramas/[id]">) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await prisma.drama.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
