import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { adminGenreSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = adminGenreSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  try {
    const genre = await prisma.genre.create({ data: parsed.data });
    return NextResponse.json({ genre }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "name_in_use" }, { status: 409 });
  }
}
