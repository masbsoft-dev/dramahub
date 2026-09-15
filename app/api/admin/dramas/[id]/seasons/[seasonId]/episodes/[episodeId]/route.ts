import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminEpisodeSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/seasons/[seasonId]/episodes/[episodeId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { episodeId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminEpisodeSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { subtitles, headersJson, ...data } = parsed.data;

  const episode = await prisma.episode
    .update({
      where: { id: episodeId },
      data: {
        ...data,
        ...(headersJson ? { headersJson } : {}),
        ...(subtitles
          ? {
              subtitles: {
                deleteMany: {},
                create: subtitles.map((s) => ({ language: s.language, vttUrl: s.url })),
              },
            }
          : {}),
      },
    })
    .catch(() => null);

  if (!episode) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ episode });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/seasons/[seasonId]/episodes/[episodeId]">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { episodeId } = await ctx.params;
  await prisma.episode.delete({ where: { id: episodeId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
