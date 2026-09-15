import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminEpisodeSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/dramas/[id]/seasons/[seasonId]/episodes">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: dramaId, seasonId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = adminEpisodeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { subtitles, headersJson, ...data } = parsed.data;

  try {
    const episode = await prisma.episode.create({
      data: {
        ...data,
        dramaId,
        seasonId,
        ...(headersJson ? { headersJson } : {}),
        subtitles: { create: subtitles.map((s) => ({ language: s.language, vttUrl: s.url })) },
      },
    });
    return NextResponse.json({ episode }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create_failed" }, { status: 400 });
  }
}
