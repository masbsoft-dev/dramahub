import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { probeDurationSchema } from "@/lib/validation";
import { probeHlsDuration, probeMp4Duration } from "@/lib/duration-probe";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = probeDurationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const { manifestUrl, format, headersJson } = parsed.data;

  const durationSeconds =
    format === "MP4"
      ? await probeMp4Duration(manifestUrl, headersJson)
      : format === "HLS"
        ? await probeHlsDuration(manifestUrl, headersJson)
        : null;

  if (!durationSeconds) {
    return NextResponse.json({ error: "duration_not_found" }, { status: 422 });
  }

  return NextResponse.json({ durationSeconds });
}
