import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safe-query";
import { getCurrentUser } from "@/lib/current-user";
import { getLangFromCookies } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { posterStyle, bannerStyleWithOverlay } from "@/lib/poster";
import { WeeklyReleases } from "@/components/home/WeeklyReleases";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const [user, lang] = await Promise.all([getCurrentUser(), getLangFromCookies()]);
  const t = dictionaries[lang];
  const params = await searchParams;
  const country = typeof params.country === "string" ? params.country : undefined;

  const dramas = await safeQuery(
    () =>
      prisma.drama.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
        take: 40,
        include: {
          episodes: {
            orderBy: [{ season: { seasonNumber: "asc" } }, { episodeNumber: "asc" }],
            take: 1,
          },
        },
      }),
    []
  );

  const featured = dramas[0];

  const continueWatching = user
    ? await safeQuery(
        () =>
          prisma.userWatchProgress.findMany({
            where: { userId: user.id, isFinished: false },
            orderBy: { updatedAt: "desc" },
            take: 6,
            include: { episode: { include: { drama: true } } },
          }),
        []
      )
    : [];

  const topDramas = [...dramas].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0)).slice(0, 10);

  const filteredCatalog = country ? dramas.filter((d) => d.countryOrigin === country) : dramas;

  return (
    <div>
      {featured && (
        <div
          className="relative min-h-[380px] md:h-[520px] flex items-end px-6 md:px-9 pb-10 md:pb-12"
          style={bannerStyleWithOverlay(
            "linear-gradient(90deg, rgba(10,10,15,.96) 0%, rgba(10,10,15,.7) 42%, rgba(10,10,15,.15) 100%)",
            featured.bannerUrl
          )}
        >
          <div className="relative max-w-[560px]">
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="text-[11px] font-extrabold tracking-[.1em] uppercase bg-accent px-2.5 py-1.5 rounded-[5px]">
                {t.newEp}
              </span>
              <span className="text-[11px] font-bold tracking-[.08em] uppercase bg-white/12 px-2.5 py-1.5 rounded-[5px] border border-white/16">
                {featured.countryOrigin === "KR" ? "🇰🇷" : "🇨🇳"} {featured.countryOrigin}
              </span>
            </div>
            <h1 className="font-display text-[34px] md:text-[52px] font-extrabold leading-[1.02] mb-3.5 tracking-[-.02em]">
              {featured.titlePortuguese}
            </h1>
            <div className="text-sm text-text-4 mb-3.5 font-semibold">
              {featured.releaseYear} · {featured.episodes.length ? t.episodes : ""}
            </div>
            <p className="text-[15px] md:text-base leading-relaxed text-text-3 mb-7 text-pretty">
              {featured.synopsis}
            </p>
            <div className="flex gap-3 items-center flex-wrap">
              {featured.episodes[0] && (
                <Link
                  href={`/watch/${featured.episodes[0].id}`}
                  className="flex items-center gap-2.5 bg-accent text-white font-bold text-[15px] md:text-base px-6 md:px-7 py-3.5 rounded-[10px] no-underline"
                >
                  ▶ {t.watchEp1}
                </Link>
              )}
              <Link
                href={`/dramas/${featured.id}`}
                className="bg-transparent border-none text-text-3 font-semibold text-sm underline"
              >
                {t.moreInfo}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-9 pb-16 flex flex-col gap-10 md:gap-[42px] -mt-6 md:-mt-8 relative pt-6">
        {continueWatching.length > 0 && (
          <div>
            <div className="font-display text-lg font-semibold mb-4">{t.continueWatching}</div>
            <div className="flex gap-3.5 overflow-x-auto pb-2.5 no-scrollbar">
              {continueWatching.map((progress) => {
                const drama = progress.episode.drama;
                const pct = progress.episode.durationSeconds
                  ? Math.round((progress.stoppedAtSeconds / progress.episode.durationSeconds) * 100)
                  : 0;
                return (
                  <Link
                    key={progress.id}
                    href={`/watch/${progress.episode.id}`}
                    className="flex-none w-[260px] bg-surface border border-white/8 rounded-xl overflow-hidden text-text no-underline"
                  >
                    <div className="h-[146px] relative flex items-center justify-center" style={posterStyle(drama.posterUrl)}>
                      <div className="w-11 h-11 rounded-full bg-black/50 border-[1.5px] border-white/60 flex items-center justify-center text-[15px]">
                        ▶
                      </div>
                      <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/55">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="px-3.5 py-3">
                      <div className="text-sm font-bold mb-0.5">{drama.titlePortuguese}</div>
                      <div className="text-xs text-text-5">
                        Ep. {progress.episode.episodeNumber} · {pct}%
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {topDramas.length > 0 && (
          <div>
            <div className="font-display text-lg font-semibold mb-4">{t.top10}</div>
            <div className="flex gap-2 overflow-x-auto pb-2.5 no-scrollbar">
              {topDramas.map((d, i) => (
                <Link
                  key={d.id}
                  href={`/dramas/${d.id}`}
                  className="flex-none flex items-end no-underline text-text"
                >
                  <span
                    className="font-display font-extrabold leading-[.78] -mr-3.5 relative z-[2] text-bg-2"
                    style={{
                      fontSize: "clamp(52px, 8vw, 86px)",
                      WebkitTextStroke: "2px rgba(255,255,255,.34)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="block w-[128px] h-[186px] rounded-[10px] border border-white/10 p-2.5 flex items-end font-display text-[11px] font-bold leading-tight text-left"
                    style={posterStyle(d.posterUrl)}
                  >
                    {d.titlePortuguese}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <WeeklyReleases
          dramas={dramas.map((d) => ({ id: d.id, titlePortuguese: d.titlePortuguese, posterUrl: d.posterUrl }))}
        />

        {dramas.length > 0 && (
          <div>
            <div className="font-display text-lg font-semibold mb-4">{t.osts}</div>
            <div className="flex gap-3.5 overflow-x-auto pb-2.5 no-scrollbar">
              {dramas.slice(0, 6).map((d) => (
                <div
                  key={d.id}
                  className="flex-none w-[250px] flex items-center gap-3.5 bg-surface border border-white/8 rounded-xl p-2.5"
                >
                  <div
                    className="w-[52px] h-[52px] rounded-full shrink-0 flex items-center justify-center text-sm"
                    style={posterStyle(d.posterUrl)}
                  >
                    ▶
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">
                      {lang === "pt" ? "Trilha de " : "Theme from "}
                      {d.titlePortuguese}
                    </div>
                    <div className="text-xs text-text-5 truncate">{d.titleOriginal ?? d.titlePortuguese}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {country && (
          <div>
            <div className="font-display text-lg font-semibold mb-4">
              {country === "KR" ? t.navK : t.navC}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
              {filteredCatalog.map((d) => (
                <Link
                  key={d.id}
                  href={`/dramas/${d.id}`}
                  className="bg-surface rounded-xl overflow-hidden border border-white/8 no-underline text-text h-[450px] flex flex-col"
                >
                  <div className="flex-1" style={posterStyle(d.posterUrl)} />
                  <div className="px-2.5 py-2 text-xs font-semibold truncate">{d.titlePortuguese}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
