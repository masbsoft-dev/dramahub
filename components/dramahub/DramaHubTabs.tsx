"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { posterStyle } from "@/lib/poster";

const DEFAULT_AVATAR_GRADIENT = "linear-gradient(160deg, #4A2A6E 0%, #170B2B 100%)";

type EpisodeItem = {
  id: string;
  episodeNumber: number;
  title: string | null;
  durationSeconds: number | null;
  pct: number;
  bg: string;
};

type SeasonItem = { id: string; seasonNumber: number; title: string | null; episodes: EpisodeItem[] };
type CastItem = { id: string; actorName: string; roleName: string | null; photoUrl: string | null };
type OstItem = {
  id: string;
  title: string;
  artistName: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
};

export function DramaHubTabs({
  seasons,
  cast,
  ost,
}: {
  seasons: SeasonItem[];
  cast: CastItem[];
  ost: OstItem[];
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<"eps" | "cast" | "ost">("eps");
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasons[0]?.id);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "eps", label: t.tabEps },
    { id: "cast", label: t.tabCast },
    { id: "ost", label: t.tabOst },
  ];

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) ?? seasons[0];

  function formatDuration(seconds: number | null) {
    if (!seconds) return "";
    return `${Math.round(seconds / 60)} min`;
  }

  function seasonLabel(season: SeasonItem) {
    return season.title ? `${t.seasonWord} ${season.seasonNumber} — ${season.title}` : `${t.seasonWord} ${season.seasonNumber}`;
  }

  function toggleTrack(track: OstItem) {
    const audio = audioRef.current;
    if (!audio || !track.audioUrl) return;

    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.src = track.audioUrl;
    audio.play().catch(() => setPlayingId(null));
    setPlayingId(track.id);
  }

  return (
    <div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => setPlayingId(null)} />

      <div className="flex gap-7 border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`bg-transparent border-none font-ui font-bold cursor-pointer text-[15px] md:text-base pb-3.5 -mb-px whitespace-nowrap ${
              tab === tb.id ? "text-text border-b-2 border-accent" : "text-text-7 border-b-2 border-transparent"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "eps" && (
        <div>
          {seasons.length > 1 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => setSelectedSeasonId(season.id)}
                  className={`font-ui text-[13px] font-bold px-4 py-2.5 rounded-[9px] cursor-pointer border ${
                    selectedSeason?.id === season.id
                      ? "bg-accent-soft border-accent text-[#FFAFC6]"
                      : "bg-white/5 border-white/12 text-text-3"
                  }`}
                >
                  {seasonLabel(season)}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {(selectedSeason?.episodes ?? []).map((e) => (
              <Link
                key={e.id}
                href={`/watch/${e.id}`}
                className="flex gap-4 md:gap-[18px] items-center bg-surface border border-white/8 rounded-xl p-3.5 text-text no-underline hover:border-accent-border transition-colors"
              >
                <span className="font-display text-lg md:text-xl font-bold text-[#4C4859] w-8 text-center shrink-0">
                  {e.episodeNumber}
                </span>
                <span
                  className="w-[120px] md:w-[170px] h-[70px] md:h-24 rounded-[9px] shrink-0 relative flex items-center justify-center text-[15px]"
                  style={posterStyle(e.bg)}
                >
                  ▶
                  <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-black/50">
                    <span className="block h-full bg-accent" style={{ width: `${e.pct}%` }} />
                  </span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex justify-between gap-4 items-baseline mb-1.5">
                    <span className="text-[15px] md:text-base font-bold">
                      {e.title ?? `Episódio ${e.episodeNumber}`}
                    </span>
                    <span className="text-[13px] text-text-7 shrink-0">{formatDuration(e.durationSeconds)}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === "cast" && (
        <div>
          {cast.length === 0 ? (
            <p className="text-sm text-text-5">{t.noCast}</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
              {cast.map((c) => (
                <div key={c.id} className="text-center">
                  <div
                    className="w-[76px] h-[76px] md:w-[100px] md:h-[100px] rounded-full mx-auto mb-2.5 border border-white/12"
                    style={posterStyle(c.photoUrl || DEFAULT_AVATAR_GRADIENT)}
                  />
                  <div className="text-xs md:text-sm font-bold mb-0.5">{c.actorName}</div>
                  <div className="text-[11px] md:text-[13px] text-text-5">{c.roleName}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "ost" && (
        <div>
          {ost.length === 0 ? (
            <p className="text-sm text-text-5">{t.noSoundtrack}</p>
          ) : (
            <div className="flex flex-col gap-2 max-w-[720px]">
              {ost.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-4 bg-surface border border-white/8 rounded-xl px-4 py-3.5"
                >
                  <button
                    type="button"
                    onClick={() => toggleTrack(o)}
                    disabled={!o.audioUrl}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-accent border-none text-white text-xs cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {playingId === o.id ? "❚❚" : "▶"}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm md:text-[15px] font-bold truncate">{o.title}</div>
                    <div className="text-xs md:text-[13px] text-text-5 truncate">{o.artistName}</div>
                  </div>
                  <div className="text-[13px] text-text-7">{formatDuration(o.durationSeconds)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
