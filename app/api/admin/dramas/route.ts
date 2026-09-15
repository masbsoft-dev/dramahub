import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminDramaSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = adminDramaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { genreIds, ...data } = parsed.data;

  const drama = await prisma.drama.create({
    data: {
      ...data,
      status: data.status ?? "DRAFT",
      genres: { create: genreIds.map((genreId) => ({ genreId })) },
    },
  });

  return NextResponse.json({ drama }, { status: 201 });
}
