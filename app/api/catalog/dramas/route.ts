import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre");
  const search = searchParams.get("q");
  const take = Math.min(Number(searchParams.get("take") ?? 40), 100);

  const dramas = await prisma.drama.findMany({
    where: {
      ...(genre ? { genres: { some: { genre: { name: genre } } } } : {}),
      ...(search
        ? {
            OR: [
              { titlePortuguese: { contains: search, mode: "insensitive" } },
              { titleOriginal: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      genres: { include: { genre: true } },
      _count: { select: { episodes: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ dramas });
}
