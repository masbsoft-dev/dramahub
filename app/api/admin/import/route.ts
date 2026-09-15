import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { playlistImportCreateSchema } from "@/lib/validation";
import { parsePlaylistText, classifyKind } from "@/lib/m3u-parser";
import { isSafeExternalUrl } from "@/lib/ssrf-guard";

const MAX_ITEMS = 20_000;

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = playlistImportCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { sourceLabel, url, content } = parsed.data;

  let text = content ?? "";
  if (url) {
    if (!isSafeExternalUrl(url)) {
      return NextResponse.json({ error: "invalid_url" }, { status: 400 });
    }
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) {
      return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    }
    text = await res.text();
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "empty_playlist" }, { status: 422 });
  }

  let items;
  try {
    items = parsePlaylistText(text);
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 422 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "no_items_found" }, { status: 422 });
  }
  if (items.length > MAX_ITEMS) {
    items = items.slice(0, MAX_ITEMS);
  }

  const playlistImport = await prisma.playlistImport.create({
    data: {
      createdByUserId: admin.id,
      sourceLabel,
      itemCount: items.length,
      items: {
        create: items.map((item) => ({
          kind: classifyKind(item),
          name: item.name,
          groupTitle: item.groupTitle,
          logoUrl: item.logoUrl,
          streamUrl: item.streamUrl,
          tvgId: item.tvgId,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ importId: playlistImport.id }, { status: 201 });
}
