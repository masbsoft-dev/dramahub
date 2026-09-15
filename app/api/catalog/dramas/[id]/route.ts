import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET(_request: Request, ctx: RouteContext<"/api/catalog/dramas/[id]">) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();

  const drama = await prisma.drama.findUnique({
    where: { id },
    include: {
      genres: { include: { genre: true } },
      episodes: {
        orderBy: [{ season: { seasonNumber: "asc" } }, { episodeNumber: "asc" }],
        include: {
          subtitles: true,
          watchProgresses: userId ? { where: { userId } } : false,
        },
      },
      favorites: userId ? { where: { userId } } : false,
    },
  });

  if (!drama) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (drama.status !== "PUBLISHED") {
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (user?.role !== "ADMIN") return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    drama: {
      ...drama,
      isFavorite: userId ? drama.favorites.length > 0 : false,
    },
  });
}
