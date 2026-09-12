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
      },
    })
    .catch(() => null);

  if (!episode) notFound();

  const token = createStreamToken(user.id, episode.id);
  const manifestUrl = `/api/stream/${episode.id}/master.m3u8?token=${token}`;
  const resumeAt = episode.watchProgresses[0]?.stoppedAtSeconds ?? 0;
  const maxAllowedScreens = 1 + user.subscription.extraScreensCount;

  return (
    <VideoPlayer
      episodeId={episode.id}
      dramaId={episode.dramaId}
      dramaTitle={episode.drama.titlePortuguese}
      episodeNumber={episode.episodeNumber}
      episodeTitle={episode.title}
      manifestUrl={manifestUrl}
      subtitles={episode.subtitles.map((s) => ({ language: s.language, vttUrl: s.vttUrl }))}
      resumeAt={resumeAt}
      durationSeconds={episode.durationSeconds}
      maxAllowedScreens={maxAllowedScreens}
    />
  );
}
