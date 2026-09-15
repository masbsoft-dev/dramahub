import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestContractSchema } from "@/lib/validation";

/**
 * Recebe o payload JSON normalizado do worker de extracao (secao 3 da
 * especificacao) e faz upsert do dorama/episodios/legendas no catalogo.
 * Protegida por uma API key estatica (equivalente simplificado da
 * autenticacao de servico-a-servico que o Kong Gateway faria).
 */
export async function POST(request: Request) {
  const expectedKey = process.env.INGEST_API_KEY;
  if (!expectedKey) {
    console.error("[ingest] INGEST_API_KEY ausente");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const providedKey = request.headers.get("x-ingest-key");
  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  if (!json) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  const parsed = ingestContractSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { drama: dramaPayload, episodes } = parsed.data;

  try {
    const drama = await prisma.$transaction(async (tx) => {
      const existing = await tx.drama.findFirst({
        where: {
          titlePortuguese: dramaPayload.title_portuguese,
          releaseYear: dramaPayload.release_year,
        },
      });

      const dramaRecord = existing
        ? await tx.drama.update({
            where: { id: existing.id },
            data: {
              titleOriginal: dramaPayload.title_original,
              synopsis: dramaPayload.synopsis,
              countryOrigin: dramaPayload.country_origin,
              posterUrl: dramaPayload.poster_url,
              bannerUrl: dramaPayload.banner_url,
            },
          })
        : await tx.drama.create({
            data: {
              titlePortuguese: dramaPayload.title_portuguese,
              titleOriginal: dramaPayload.title_original,
              synopsis: dramaPayload.synopsis,
              countryOrigin: dramaPayload.country_origin,
              releaseYear: dramaPayload.release_year,
              posterUrl: dramaPayload.poster_url,
              bannerUrl: dramaPayload.banner_url,
            },
          });

      for (const genreName of dramaPayload.genres) {
        const genre = await tx.genre.upsert({
          where: { name: genreName },
          create: { name: genreName },
          update: {},
        });
        await tx.dramaGenre.upsert({
          where: { dramaId_genreId: { dramaId: dramaRecord.id, genreId: genre.id } },
          create: { dramaId: dramaRecord.id, genreId: genre.id },
          update: {},
        });
      }

      // Contrato de ingestao nao tem conceito de temporada — tudo cai na
      // temporada 1 do dorama (comportamento correto e nao regressivo).
      const season = await tx.season.upsert({
        where: { dramaId_seasonNumber: { dramaId: dramaRecord.id, seasonNumber: 1 } },
        create: { dramaId: dramaRecord.id, seasonNumber: 1 },
        update: {},
      });

      for (const ep of episodes) {
        const episode = await tx.episode.upsert({
          where: {
            seasonId_episodeNumber: {
              seasonId: season.id,
              episodeNumber: ep.episode_number,
            },
          },
          create: {
            dramaId: dramaRecord.id,
            seasonId: season.id,
            episodeNumber: ep.episode_number,
            title: ep.title,
            manifestUrl: ep.manifest_url,
            format: ep.format,
            headersJson: ep.headers_required ?? undefined,
            durationSeconds: ep.duration_seconds,
          },
          update: {
            title: ep.title,
            manifestUrl: ep.manifest_url,
            format: ep.format,
            headersJson: ep.headers_required ?? undefined,
            durationSeconds: ep.duration_seconds,
          },
        });

        await tx.subtitle.deleteMany({ where: { episodeId: episode.id } });
        if (ep.subtitles.length) {
          await tx.subtitle.createMany({
            data: ep.subtitles.map((s) => ({
              episodeId: episode.id,
              language: s.language,
              vttUrl: s.url,
            })),
          });
        }
      }

      return dramaRecord;
    });

    return NextResponse.json({ dramaId: drama.id }, { status: 201 });
  } catch (err) {
    console.error("[ingest] erro ao processar payload", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
