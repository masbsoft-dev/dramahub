import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getLangFromCookies } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { bannerStyleWithOverlay, posterStyle } from "@/lib/poster";
import { fakeCast, fakeOst } from "@/lib/fake-cast";
import { DramaHubTabs } from "@/components/dramahub/DramaHubTabs";
import { FavoriteButton } from "@/components/dramahub/FavoriteButton";
import Link from "next/link";

export default async function DramaHubPage({ params }: PageProps<"/dramas/[id]">) {
  const { id } = await params;
  const [user, lang] = await Promise.all([getCurrentUser(), getLangFromCookies()]);
  const t = dictionaries[lang];

  const drama = await prisma.drama
    .findUnique({
      where: { id },
      include: {
        episodes: {
          orderBy: { episodeNumber: "asc" },
          include: { watchProgresses: user ? { where: { userId: user.id } } : false },
        },
        favorites: user ? { where: { userId: user.id } } : false,
      },
    })
    .catch(() => null);

  if (!drama) notFound();

  const isFavorite = user ? drama.favorites.length > 0 : false;

  const episodeItems = drama.episodes.map((e) => {
    const progress = e.watchProgresses[0];
    const pct =
      progress && e.durationSeconds
        ? progress.isFinished
          ? 100
          : Math.round((progress.stoppedAtSeconds / e.durationSeconds) * 100)
        : 0;
    return {
      id: e.id,
      episodeNumber: e.episodeNumber,
      title: e.title,
      durationSeconds: e.durationSeconds,
      pct,
      bg: drama.posterUrl,
    };
  });

  const cast = fakeCast(drama.id, drama.posterUrl, lang);
  const ost = fakeOst(drama.id, drama.titlePortuguese);
  const nextUnwatched = drama.episodes.find((e) => e.watchProgresses.length === 0) ?? drama.episodes[0];

  return (
    <div>
      <div
        className="relative px-6 md:px-9 pt-10 md:pt-14 pb-8 md:pb-10"
        style={bannerStyleWithOverlay(
          "linear-gradient(90deg, rgba(10,10,15,.95) 0%, rgba(10,10,15,.6) 55%, rgba(10,10,15,.2) 100%)",
          drama.bannerUrl
        )}
      >
        <div className="flex flex-col sm:flex-row gap-6 md:gap-8 items-start sm:items-end">
          <div
            className="w-[140px] h-[208px] md:w-[210px] md:h-[312px] rounded-2xl border border-white/16 shrink-0 p-4 flex items-end shadow-[0_24px_60px_rgba(0,0,0,.55)]"
            style={posterStyle(drama.posterUrl)}
          >
            <span className="font-display text-sm md:text-base font-bold leading-tight">
              {drama.titlePortuguese}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl md:text-[40px] font-extrabold mb-3 leading-[1.06]">
              {drama.titlePortuguese}
            </h1>
            <div className="flex gap-3 md:gap-3.5 items-center flex-wrap mb-4 text-sm text-text-4 font-semibold">
              {drama.rating && <span className="text-accent font-extrabold">★ {Number(drama.rating).toFixed(1)}</span>}
              <span>{drama.releaseYear}</span>
              <span>·</span>
              <span>
                {drama.episodes.length} {t.episodes}
              </span>
              <span>·</span>
              <span className="bg-white/10 rounded-[5px] px-2.5 py-1 text-xs">1080p</span>
            </div>
            <p className="text-[15px] md:text-base leading-relaxed text-text-3 mb-6 max-w-[660px] text-pretty">
              {drama.synopsis}
            </p>
            <div className="flex gap-3 items-center flex-wrap">
              {nextUnwatched && (
                <Link
                  href={`/watch/${nextUnwatched.id}`}
                  className="flex items-center gap-2.5 bg-accent text-white font-bold text-[15px] md:text-base px-6 md:px-7 py-3.5 rounded-[10px] no-underline"
                >
                  ▶ {t.watchEp1}
                </Link>
              )}
              {user && <FavoriteButton dramaId={drama.id} initialFavorite={isFavorite} />}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-9 pb-16">
        <DramaHubTabs episodes={episodeItems} cast={cast} ost={ost} />
      </div>
    </div>
  );
}
