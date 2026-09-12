"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { posterStyle } from "@/lib/poster";

type EpisodeItem = {
  id: string;
  episodeNumber: number;
  title: string | null;
  durationSeconds: number | null;
  pct: number;
  bg: string;
};

type CastItem = { key: string; actor: string; role: string; style: React.CSSProperties };
type OstItem = { key: string; song: string; artist: string; dur: string };

export function DramaHubTabs({
  episodes,
  cast,
  ost,
}: {
  episodes: EpisodeItem[];
  cast: CastItem[];
  ost: OstItem[];
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<"eps" | "cast" | "ost">("eps");

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "eps", label: t.tabEps },
    { id: "cast", label: t.tabCast },
    { id: "ost", label: t.tabOst },
  ];

  function formatDuration(seconds: number | null) {
    if (!seconds) return "";
    return `${Math.round(seconds / 60)} min`;
  }

  return (
    <div>
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
        <div className="flex flex-col gap-2.5">
          {episodes.map((e) => (
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
      )}

      {tab === "cast" && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
          {cast.map((c) => (
            <div key={c.key} className="text-center">
              <div
                className="w-[76px] h-[76px] md:w-[100px] md:h-[100px] rounded-full mx-auto mb-2.5 border border-white/12"
                style={c.style}
              />
              <div className="text-xs md:text-sm font-bold mb-0.5">{c.actor}</div>
              <div className="text-[11px] md:text-[13px] text-text-5">{c.role}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "ost" && (
        <div className="flex flex-col gap-2 max-w-[720px]">
          {ost.map((o) => (
            <div
              key={o.key}
              className="flex items-center gap-4 bg-surface border border-white/8 rounded-xl px-4 py-3.5"
            >
              <button className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-accent border-none text-white text-xs cursor-pointer shrink-0">
                ▶
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm md:text-[15px] font-bold truncate">{o.song}</div>
                <div className="text-xs md:text-[13px] text-text-5 truncate">{o.artist}</div>
              </div>
              <div className="text-[13px] text-text-7">{o.dur}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
