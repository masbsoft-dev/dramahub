import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DramaForm } from "@/components/admin/DramaForm";
import { SeasonsManager } from "@/components/admin/SeasonsManager";
import { CastManager } from "@/components/admin/CastManager";
import { SoundtrackManager } from "@/components/admin/SoundtrackManager";

export default async function EditDramaPage({ params }: PageProps<"/admin/dramas/[id]">) {
  const { id } = await params;

  const [drama, allGenres] = await Promise.all([
    prisma.drama.findUnique({
      where: { id },
      include: {
        genres: true,
        seasons: {
          orderBy: { seasonNumber: "asc" },
          include: {
            episodes: {
              orderBy: { episodeNumber: "asc" },
              include: { subtitles: true },
            },
          },
        },
        castMembers: { orderBy: { order: "asc" } },
        soundtrackTracks: { orderBy: { order: "asc" } },
      },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!drama) notFound();

  return (
    <div className="px-6 md:px-10 py-10 pb-20">
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-8">{drama.titlePortuguese}</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <DramaForm
          initial={{
            id: drama.id,
            titlePortuguese: drama.titlePortuguese,
            titleOriginal: drama.titleOriginal ?? "",
            synopsis: drama.synopsis,
            countryOrigin: drama.countryOrigin,
            releaseYear: drama.releaseYear,
            posterUrl: drama.posterUrl,
            bannerUrl: drama.bannerUrl,
            rating: drama.rating ? String(drama.rating) : "",
            status: drama.status,
            genreIds: drama.genres.map((g) => g.genreId),
          }}
          allGenres={allGenres}
        />
        <SeasonsManager
          dramaId={drama.id}
          seasons={drama.seasons.map((season) => ({
            ...season,
            episodes: season.episodes.map((ep) => ({
              ...ep,
              subtitles: ep.subtitles.map((s) => ({ language: s.language, url: s.vttUrl })),
            })),
          }))}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mt-12">
        <CastManager dramaId={drama.id} members={drama.castMembers} />
        <SoundtrackManager dramaId={drama.id} tracks={drama.soundtrackTracks} />
      </div>
    </div>
  );
}
