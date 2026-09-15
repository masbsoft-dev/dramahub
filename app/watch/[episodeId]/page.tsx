import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { createStreamToken } from "@/lib/stream-token";
import { VideoPlayer } from "@/components/player/VideoPlayer";

export default async function WatchPage({ params }: PageProps<"/watch/[episodeId]">) {
  const { episodeId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=/watch/${episodeId}`);

  if (!user.subscription || user.subscription.status !== "ACTIVE") {
    redirect("/plano");
  }

  const episode = await prisma.episode
    .findUnique({
      where: { id: episodeId },
      include: {
        drama: true,
        subtitles: true,
        watchProgresses: { where: { userId: user.id } },
        season: { select: { id: true, seasonNumber: true, title: true } },
      },
    })
    .catch(() => null);

  if (!episode) notFound();

  if (episode.format === "DASH") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-2 text-center px-6">
        <p className="text-text-5 text-sm max-w-[360px]">
          Este episódio usa um formato (DASH) que ainda não tem suporte de reprodução.
        </p>
      </div>
    );
  }

  const token = createStreamToken(user.id, episode.id);
  const streamPath = episode.format === "MP4" ? "file.mp4" : "master.m3u8";
  const manifestUrl = `/api/stream/${episode.id}/${streamPath}?token=${token}`;
  const resumeAt = episode.watchProgresses[0]?.stoppedAtSeconds ?? 0;
  const maxAllowedScreens = 1 + user.subscription.extraScreensCount;

  const siblingEpisodes = await prisma.episode.findMany({
    where: { dramaId: episode.dramaId },
    orderBy: [{ season: { seasonNumber: "asc" } }, { episodeNumber: "asc" }],
    select: {
      id: true,
      episodeNumber: true,
      title: true,
      durationSeconds: true,
      season: { select: { seasonNumber: true } },
      watchProgresses: { where: { userId: user.id }, select: { stoppedAtSeconds: true, isFinished: true } },
    },
  });

  return (
    <VideoPlayer
      episodeId={episode.id}
      dramaId={episode.dramaId}
      dramaTitle={episode.drama.titlePortuguese}
      seasonNumber={episode.season.seasonNumber}
      episodeNumber={episode.episodeNumber}
      episodeTitle={episode.title}
      manifestUrl={manifestUrl}
      format={episode.format}
      subtitles={episode.subtitles.map((s) => ({ language: s.language, vttUrl: s.vttUrl }))}
      resumeAt={resumeAt}
      durationSeconds={episode.durationSeconds}
      maxAllowedScreens={maxAllowedScreens}
      episodes={siblingEpisodes.map((e) => ({
        id: e.id,
        seasonNumber: e.season.seasonNumber,
        episodeNumber: e.episodeNumber,
        title: e.title,
        durationSeconds: e.durationSeconds,
        progressSeconds: e.watchProgresses[0]?.stoppedAtSeconds ?? 0,
        isFinished: e.watchProgresses[0]?.isFinished ?? false,
      }))}
    />
  );
}
