import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/require-admin";
import { playlistImportPublishSchema } from "@/lib/validation";
import { parseSeriesEpisode, guessFormat } from "@/lib/m3u-parser";

const PLACEHOLDER_SYNOPSIS = "Importado via M3U — edite a sinopse antes de publicar.";
const PLACEHOLDER_GRADIENT = "linear-gradient(160deg, #4A2A6E 0%, #170B2B 100%)";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/import/[importId]/publish">
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { importId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = playlistImportPublishSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 422 });
  }

  const items = await prisma.playlistImportItem.findMany({
    where: { id: { in: parsed.data.itemIds }, importId, status: "PENDING" },
  });
  if (items.length === 0) {
    return NextResponse.json({ error: "no_pending_items" }, { status: 422 });
  }

  const movieItems = items.filter((i) => i.kind === "MOVIE");
  const seriesItems = items.filter((i) => i.kind === "SERIES");
  const skippedIds = items.filter((i) => i.kind !== "MOVIE" && i.kind !== "SERIES").map((i) => i.id);

  const createdDramaIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Filmes: 1 item = 1 dorama com 1 episodio numa temporada unica implicita
    // (o schema exige seasonId em todo episodio, mesmo para filme).
    for (const item of movieItems) {
      const drama = await tx.drama.create({
        data: {
          titlePortuguese: item.name,
          synopsis: PLACEHOLDER_SYNOPSIS,
          releaseYear: new Date().getFullYear(),
          posterUrl: item.logoUrl || PLACEHOLDER_GRADIENT,
          bannerUrl: item.logoUrl || PLACEHOLDER_GRADIENT,
          status: "DRAFT",
        },
      });
      await tx.season.create({
        data: {
          dramaId: drama.id,
          seasonNumber: 1,
          episodes: {
            create: [
              {
                dramaId: drama.id,
                episodeNumber: 1,
                title: item.name,
                posterUrl: item.logoUrl,
                manifestUrl: item.streamUrl,
                format: guessFormat(item.streamUrl),
              },
            ],
          },
        },
      });
      createdDramaIds.push(drama.id);
      await tx.playlistImportItem.update({
        where: { id: item.id },
        data: { status: "IMPORTED", createdDramaId: drama.id },
      });
    }

    // Series: agrupa por titulo-base (best-effort a partir do nome do item),
    // depois por temporada (numero extraido do nome pelo parser, ou 1) — cada
    // subgrupo vira uma Season propria, sem misturar numeracao de episodio
    // entre temporadas diferentes.
    const groups = new Map<string, typeof seriesItems>();
    for (const item of seriesItems) {
      const { baseTitle } = parseSeriesEpisode(item.name);
      const list = groups.get(baseTitle) ?? [];
      list.push(item);
      groups.set(baseTitle, list);
    }

    for (const [baseTitle, groupItems] of groups) {
      let drama = await tx.drama.findFirst({
        where: { titlePortuguese: baseTitle, status: "DRAFT" },
      });
      if (!drama) {
        drama = await tx.drama.create({
          data: {
            titlePortuguese: baseTitle,
            synopsis: PLACEHOLDER_SYNOPSIS,
            releaseYear: new Date().getFullYear(),
            posterUrl: groupItems[0].logoUrl || PLACEHOLDER_GRADIENT,
            bannerUrl: groupItems[0].logoUrl || PLACEHOLDER_GRADIENT,
            status: "DRAFT",
          },
        });
      }
      createdDramaIds.push(drama.id);

      const seasonGroups = new Map<number, typeof groupItems>();
      for (const item of groupItems) {
        const { season } = parseSeriesEpisode(item.name);
        const seasonNumber = season ?? 1;
        const list = seasonGroups.get(seasonNumber) ?? [];
        list.push(item);
        seasonGroups.set(seasonNumber, list);
      }

      for (const [seasonNumber, seasonItems] of seasonGroups) {
        let season = await tx.season.findFirst({
          where: { dramaId: drama.id, seasonNumber },
        });
        if (!season) {
          season = await tx.season.create({ data: { dramaId: drama.id, seasonNumber } });
        }

        const existingNumbers = new Set(
          (
            await tx.episode.findMany({ where: { seasonId: season.id }, select: { episodeNumber: true } })
          ).map((e) => e.episodeNumber)
        );
        let nextFallback = existingNumbers.size ? Math.max(...existingNumbers) + 1 : 1;

        for (const item of seasonItems) {
          const { episode: parsedEpisode } = parseSeriesEpisode(item.name);
          let episodeNumber = parsedEpisode ?? nextFallback;
          while (existingNumbers.has(episodeNumber)) episodeNumber++;
          existingNumbers.add(episodeNumber);
          if (episodeNumber >= nextFallback) nextFallback = episodeNumber + 1;

          await tx.episode.create({
            data: {
              dramaId: drama.id,
              seasonId: season.id,
              episodeNumber,
              title: item.name,
              posterUrl: item.logoUrl,
              manifestUrl: item.streamUrl,
              format: guessFormat(item.streamUrl),
            },
          });
          await tx.playlistImportItem.update({
            where: { id: item.id },
            data: { status: "IMPORTED", createdDramaId: drama!.id },
          });
        }
      }
    }

    if (skippedIds.length) {
      await tx.playlistImportItem.updateMany({
        where: { id: { in: skippedIds } },
        data: { status: "SKIPPED" },
      });
    }
    // Import em lote faz varios round-trips sequenciais (1 por episodio/item)
    // dentro da mesma transacao — o timeout padrao de 5s do Prisma estoura
    // facilmente em importacoes de temporadas inteiras (ex.: 15+ episodios).
  }, {
    timeout: 60_000,
    maxWait: 10_000,
  });

  return NextResponse.json({ createdDramaIds });
}
