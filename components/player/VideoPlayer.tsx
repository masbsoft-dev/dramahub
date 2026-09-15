"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

type SubtitleTrack = { language: string; vttUrl: string };

type EpisodeListItem = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string | null;
  durationSeconds: number | null;
  progressSeconds: number;
  isFinished: boolean;
};

function SeekArrowIcon({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 36 36"
      className={`absolute inset-0 w-full h-full ${flip ? "-scale-x-100" : ""}`}
      fill="none"
    >
      <path
        d="M 28 18 A 10 10 0 0 1 18 28 A 10 10 0 0 1 8 18 A 10 10 0 0 1 18 8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M 14 4 L 18 8 L 14 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const GLOSSARY_MARKERS = [
  { left: 15, term: "Chaebol", romanization: "재벌" },
  { left: 45, term: "Chaebol", romanization: "재벌" },
  { left: 75, term: "Chaebol", romanization: "재벌" },
];

const HEARTBEAT_INTERVAL_MS = 10_000;
const PROGRESS_SAVE_INTERVAL_MS = 15_000;

export function VideoPlayer({
  episodeId,
  dramaId,
  dramaTitle,
  seasonNumber,
  episodeNumber,
  manifestUrl,
  format,
  subtitles,
  resumeAt,
  durationSeconds,
  maxAllowedScreens,
  episodes,
}: {
  episodeId: string;
  dramaId: string;
  dramaTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string | null;
  manifestUrl: string;
  format: "HLS" | "MP4";
  subtitles: SubtitleTrack[];
  resumeAt: number;
  durationSeconds: number | null;
  maxAllowedScreens: number;
  episodes: EpisodeListItem[];
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deviceFingerprintRef = useRef<string | null>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(resumeAt);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [showGlossary, setShowGlossary] = useState(true);
  const [openMarkerIndex, setOpenMarkerIndex] = useState<number | null>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [modalSeason, setModalSeason] = useState(seasonNumber);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [subLangIndex, setSubLangIndex] = useState(0); // 0 = pt-BR se existir
  const [dualSubs, setDualSubs] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<{ index: number; label: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto (hls.js)
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeCue, setActiveCue] = useState<{ primary: string; secondary: string }>({
    primary: "",
    secondary: "",
  });

  const wantsPlayRef = useRef(false);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Auto-hide dos controles apos inatividade (so enquanto tocando) ----
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = null;
    if (!playing || showSettings || showEpisodes || showLimitModal) return;
    hideControlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, [playing, showSettings, showEpisodes, showLimitModal]);

  const wakeControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  // So reagenda/cancela o timer com base no estado atual — mostrar os
  // controles de fato acontece nos proprios handlers (onPause, wakeControls),
  // nunca com setState direto aqui dentro (evita cascata de renders).
  useEffect(() => {
    scheduleHideControls();
  }, [scheduleHideControls]);

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, []);

  // ---- Setup da fonte: MP4 e arquivo direto, HLS precisa de hls.js/nativo ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Autoplay ao abrir o player (e a cada troca de episodio) — o listener
    // de loadedmetadata mais abaixo checa esta ref e chama play() assim que
    // a fonte estiver pronta. Se o navegador bloquear o autoplay, play()
    // falha silenciosamente e o usuario so precisa clicar em play.
    wantsPlayRef.current = true;
    setQualityLevels([]);
    setCurrentLevel(-1);

    if (format === "MP4") {
      video.src = manifestUrl;
      return;
    }

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari toca HLS nativamente e gerencia o ABR internamente — sem
      // hls.js aqui, nao ha como expor niveis de qualidade selecionaveis.
      video.src = manifestUrl;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) return;
        hls = new Hls();
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (data.levels.length > 1) {
            setQualityLevels(
              data.levels.map((level, index) => ({
                index,
                label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
              }))
            );
          }
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setCurrentLevel(data.level);
        });

        hls.loadSource(manifestUrl);
        hls.attachMedia(video);
      });
    }

    return () => {
      cancelled = true;
      hlsRef.current = null;
      hls?.destroy();
    };
  }, [manifestUrl, format]);

  function selectQuality(levelIndex: number) {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoadedMetadata = () => {
      if (resumeAt > 0) video.currentTime = resumeAt;
      setDuration(video.duration || durationSeconds || 0);
      // hls.js anexa a fonte de forma assincrona: se o usuario clicou em
      // play antes disso, o play() original falhou silenciosamente — agora
      // que ha metadata, tentamos de novo.
      if (wantsPlayRef.current) video.play().catch(() => {});
    };
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, [resumeAt, durationSeconds]);

  // ---- Device fingerprint ----
  useEffect(() => {
    getDeviceFingerprint().then((fp) => {
      deviceFingerprintRef.current = fp;
    });
  }, []);

  // ---- Heartbeat de telas simultaneas ----
  useEffect(() => {
    if (!playing) return;

    async function sendHeartbeat() {
      const deviceFingerprint = deviceFingerprintRef.current;
      if (!deviceFingerprint) return;
      const res = await fetch("/api/playback/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, deviceFingerprint }),
      }).catch(() => null);

      if (res && res.status === 409) {
        videoRef.current?.pause();
        setPlaying(false);
        setShowLimitModal(true);
      }
    }

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [playing, episodeId]);

  // ---- Progresso de reproducao ----
  const saveProgress = useCallback(
    (finished = false) => {
      const video = videoRef.current;
      if (!video) return;
      fetch("/api/watch-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId,
          stoppedAtSeconds: Math.floor(video.currentTime),
          isFinished: finished,
        }),
      }).catch(() => null);
    },
    [episodeId]
  );

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => saveProgress(false), PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [playing, saveProgress]);

  useEffect(() => {
    return () => {
      saveProgress(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Legendas (cuechange custom, para estilizar igual ao design) ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const primaryTrack = video.textTracks[subLangIndex];
    const secondaryIndex = subtitles.findIndex((_, i) => i !== subLangIndex);
    const secondaryTrack = dualSubs && secondaryIndex >= 0 ? video.textTracks[secondaryIndex] : null;

    function readCue(track: TextTrack | undefined | null): string {
      if (!track || !track.activeCues || track.activeCues.length === 0) return "";
      return (track.activeCues[0] as VTTCue).text ?? "";
    }

    function handleCueChange() {
      setActiveCue({
        primary: readCue(primaryTrack),
        secondary: readCue(secondaryTrack),
      });
    }

    // Todas as faixas ficam "hidden" (sem UI nativa do browser) — a legenda
    // e desenhada por nos via cuechange, para bater com o visual do design.
    for (const tt of Array.from(video.textTracks)) tt.mode = "hidden";

    primaryTrack?.addEventListener("cuechange", handleCueChange);
    secondaryTrack?.addEventListener("cuechange", handleCueChange);

    return () => {
      primaryTrack?.removeEventListener("cuechange", handleCueChange);
      secondaryTrack?.removeEventListener("cuechange", handleCueChange);
    };
  }, [subLangIndex, dualSubs, subtitles]);

  // ---- Fullscreen ----
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Navegador recusou (ex.: falta de gesto do usuario) — sem tela cheia, sem quebrar o player.
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function handleVolumeChange(next: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(next === 0);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      wantsPlayRef.current = true;
      // hls.js anexa a fonte de forma assincrona; play() pode ser chamado
      // antes disso (ex.: clique logo apos montar) e rejeitar. O estado
      // `playing` so muda de verdade via onPlay/onPause do <video>; se este
      // play() falhar, o listener de loadedmetadata tenta de novo assim que
      // a fonte estiver pronta (ver wantsPlayRef).
      video.play().catch(() => {});
    } else {
      wantsPlayRef.current = false;
      video.pause();
      saveProgress(false);
    }
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || duration, video.currentTime + delta));
  }

  function seekToPct(pct: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = (pct / 100) * duration;
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  const currentIndex = episodes.findIndex((e) => e.id === episodeId);
  const nextEpisode = currentIndex >= 0 ? episodes[currentIndex + 1] : undefined;

  const episodesBySeasons = episodes.reduce<Map<number, EpisodeListItem[]>>((map, ep) => {
    const list = map.get(ep.seasonNumber) ?? [];
    list.push(ep);
    map.set(ep.seasonNumber, list);
    return map;
  }, new Map());

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-black dh-fade-in"
      style={{
        background: "linear-gradient(165deg,#2A1020 0%,#0C0812 55%,#050508 100%)",
        cursor: showControls ? "default" : "none",
      }}
      onMouseMove={wakeControls}
      onTouchStart={wakeControls}
      onClick={wakeControls}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(70% 60% at 50% 40%, rgba(255,61,113,.14) 0%, transparent 70%)",
        }}
      />

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => saveProgress(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onDoubleClick={toggleFullscreen}
        playsInline
      >
        {subtitles.map((s, i) => (
          <track key={s.language} kind="subtitles" srcLang={s.language} src={s.vttUrl} label={s.language} default={i === 0} />
        ))}
      </video>

      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 md:p-[22px] flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent z-10 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Link
          href={`/dramas/${dramaId}`}
          className="flex items-center gap-2.5 md:gap-[11px] bg-transparent border-none text-white font-ui text-sm md:text-base font-semibold no-underline"
        >
          <span className="text-lg md:text-[19px]">←</span>
          <span className="truncate max-w-[45vw]">
            {dramaTitle} ·{" "}
            <span className="text-text-4">
              S{seasonNumber}:E{episodeNumber}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-2.5">
          <button
            type="button"
            onClick={() => {
              setModalSeason(seasonNumber);
              setShowEpisodes(true);
            }}
            className="flex items-center gap-2 bg-white/10 border border-white/18 text-white font-ui text-[13px] md:text-sm font-semibold px-3 md:px-4 py-2 md:py-[9px] rounded-[9px] cursor-pointer"
          >
            ☰ <span className="hidden sm:inline">{t.tabEps}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-white/10 border border-white/18 text-white font-ui text-[13px] md:text-sm font-semibold px-3 md:px-4 py-2 md:py-[9px] rounded-[9px] cursor-pointer"
          >
            ⚙ <span className="hidden sm:inline">{t.settings}</span>
          </button>
        </div>
      </div>

      {/* Center controls */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-8 md:gap-14 z-10 pointer-events-none transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => seekBy(-10)}
          className={`${showControls ? "pointer-events-auto" : "pointer-events-none"} relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 border border-white/20 text-white cursor-pointer flex items-center justify-center`}
        >
          <SeekArrowIcon flip />
          <span className="relative text-xs md:text-sm font-bold">10</span>
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className={`${showControls ? "pointer-events-auto" : "pointer-events-none"} w-[72px] h-[72px] md:w-[92px] md:h-[92px] rounded-full bg-white/14 border-2 border-white/50 backdrop-blur text-white text-2xl md:text-3xl cursor-pointer flex items-center justify-center`}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={() => seekBy(10)}
          className={`${showControls ? "pointer-events-auto" : "pointer-events-none"} relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 border border-white/20 text-white cursor-pointer flex items-center justify-center`}
        >
          <SeekArrowIcon />
          <span className="relative text-xs md:text-sm font-bold">10</span>
        </button>
      </div>

      {/* Glossario cultural */}
      {showGlossary && openMarkerIndex !== null && (
        <div className="absolute top-[80px] md:top-[92px] right-4 md:right-7 left-4 sm:left-auto sm:w-[330px] bg-[rgba(20,20,29,.96)] border border-accent-border rounded-2xl p-4 md:p-[22px] backdrop-blur-xl shadow-2xl z-20 dh-fade-in">
          <div className="flex justify-between items-start gap-3 mb-3">
            <div>
              <div className="text-[11px] font-extrabold tracking-[.12em] uppercase text-[#FF7FA2] mb-1.5">
                {t.glossary}
              </div>
              <div className="font-display text-base md:text-[19px] font-bold">
                {GLOSSARY_MARKERS[openMarkerIndex].term}{" "}
                <span className="text-[13px] text-text-7 font-ui">
                  {GLOSSARY_MARKERS[openMarkerIndex].romanization}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGlossary(false)}
              className="bg-transparent border-none text-text-7 text-lg cursor-pointer leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm leading-relaxed text-text-3 m-0">
            {lang === "pt"
              ? "Conglomerado familiar sul-coreano. Grandes grupos empresariais controlados por uma única família ao longo de gerações — um cenário recorrente nos doramas de romance e poder."
              : "A South Korean family conglomerate. Large business groups controlled by a single family across generations — a recurring setting in romance and power dramas."}
          </p>
        </div>
      )}

      {/* Legenda customizada */}
      {(activeCue.primary || activeCue.secondary) && (
        <div className="absolute left-0 right-0 bottom-[104px] md:bottom-[132px] text-center px-4 z-10">
          {activeCue.primary && (
            <span className="inline-block bg-black/60 rounded-lg px-4 md:px-5 py-2 md:py-2.5 text-base md:text-xl font-semibold leading-snug max-w-[720px]">
              {activeCue.primary}
            </span>
          )}
          {dualSubs && activeCue.secondary && (
            <div className="mt-2">
              <span className="inline-block bg-black/45 rounded-lg px-3.5 py-1.5 text-sm md:text-base text-text-4">
                {activeCue.secondary}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div
        className={`absolute left-0 right-0 bottom-0 p-4 md:p-7 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4 mb-3.5 md:mb-[18px]">
          <span className="text-xs md:text-[13px] text-text-3 font-semibold tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div
            className="flex-1 relative h-[5px] rounded-full bg-white/22 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekToPct(((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 bg-accent rounded-full" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 w-[15px] h-[15px] rounded-full bg-white -translate-y-1/2 -translate-x-1/2 shadow"
              style={{ left: `${pct}%` }}
            />
            {GLOSSARY_MARKERS.map((m, i) => (
              <button
                key={i}
                type="button"
                title={m.term}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMarkerIndex(i);
                  setShowGlossary(true);
                }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[11px] h-[11px] rounded-full bg-marker border-2 border-bg-2 cursor-pointer p-0"
                style={{ left: `${m.left}%` }}
              />
            ))}
          </div>
          <span className="text-xs md:text-[13px] text-text-3 font-semibold tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-5">
            <button type="button" onClick={togglePlay} className="bg-transparent border-none text-white text-base md:text-lg cursor-pointer">
              {playing ? "❚❚" : "▶"}
            </button>
            <div className="hidden sm:flex items-center gap-2 group">
              <button
                type="button"
                onClick={toggleMute}
                className="bg-transparent border-none text-white text-base cursor-pointer"
              >
                {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-0 opacity-0 group-hover:w-[70px] group-hover:opacity-100 focus:w-[70px] focus:opacity-100 transition-all duration-200 accent-[var(--color-accent)] cursor-pointer"
              />
            </div>
            {nextEpisode && (
              <span className="hidden sm:inline text-[13px] text-text-5">
                {t.nextEp}: S{nextEpisode.seasonNumber}:E{nextEpisode.episodeNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 md:gap-3">
            <button
              type="button"
              onClick={() => seekBy(85)}
              className="bg-white/14 border border-white/22 text-white font-ui text-xs md:text-[13px] font-bold px-3 md:px-4 py-2 md:py-[9px] rounded-lg cursor-pointer"
            >
              {t.skipIntro}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="bg-transparent border-none text-white text-base md:text-lg cursor-pointer"
            >
              {isFullscreen ? "⤡" : "⤢"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de episodios */}
      {showEpisodes && (
        <div
          className="absolute inset-0 z-30 bg-[rgba(5,5,9,.82)] flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setShowEpisodes(false)}
        >
          <div
            className="w-full sm:w-[560px] max-w-full max-h-[80vh] bg-[#14141D] border-t sm:border border-white/12 rounded-t-[22px] sm:rounded-2xl p-6 sm:p-8 dh-fade-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden w-[38px] h-1 rounded-sm bg-white/22 mx-auto mb-5" />
            <div className="flex justify-between items-start mb-5 sm:mb-6">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold m-0">{dramaTitle}</h2>
                <p className="text-xs text-text-7 mt-1">
                  {episodes.length} {t.episodes}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEpisodes(false)}
                className="bg-transparent border-none text-text-7 text-xl cursor-pointer leading-none"
              >
                ×
              </button>
            </div>

            {episodesBySeasons.size > 1 && (
              <select
                value={modalSeason}
                onChange={(e) => setModalSeason(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/14 rounded-[9px] px-3 py-2.5 text-sm text-white outline-none focus:border-accent mb-4"
              >
                {[...episodesBySeasons.keys()].map((season) => (
                  <option key={season} value={season} className="bg-[#14141D] text-white">
                    {t.seasonWord} {season}
                  </option>
                ))}
              </select>
            )}

            <div className="overflow-y-auto flex-1 -mx-2 px-2 flex flex-col gap-1.5">
              {(episodesBySeasons.get(modalSeason) ?? []).map((ep) => {
                const isCurrent = ep.id === episodeId;
                const pct = ep.durationSeconds
                  ? Math.min(100, (ep.progressSeconds / ep.durationSeconds) * 100)
                  : 0;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => {
                      if (isCurrent) {
                        setShowEpisodes(false);
                        return;
                      }
                      setShowEpisodes(false);
                      router.push(`/watch/${ep.id}`);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer border ${
                      isCurrent
                        ? "bg-accent-soft border-accent"
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCurrent ? "bg-accent text-white" : "bg-white/10 text-text-4"
                      }`}
                    >
                      {isCurrent ? "▶" : ep.episodeNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        S{ep.seasonNumber}:E{ep.episodeNumber}
                        {ep.title ? ` · ${ep.title}` : ""}
                      </div>
                      <div className="text-xs text-text-6 mt-0.5">
                        {ep.durationSeconds ? formatTime(ep.durationSeconds) : "--:--"}
                        {ep.isFinished && ` · ${t.watched}`}
                      </div>
                      {pct > 0 && !ep.isFinished && (
                        <div className="mt-1.5 h-[3px] rounded-full bg-white/15 overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings sheet */}
      {showSettings && (
        <div className="absolute inset-0 z-30 bg-[rgba(5,5,9,.82)] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="w-full sm:w-[560px] max-w-full bg-[#14141D] border-t sm:border border-white/12 rounded-t-[22px] sm:rounded-2xl p-6 sm:p-8 dh-fade-in">
            <div className="sm:hidden w-[38px] h-1 rounded-sm bg-white/22 mx-auto mb-5" />
            <div className="flex justify-between items-center mb-6 sm:mb-7">
              <h2 className="font-display text-lg sm:text-xl font-bold m-0">{t.mediaSettings}</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="bg-transparent border-none text-text-7 text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mb-6 sm:mb-[26px]">
              <div className="text-xs tracking-[.12em] uppercase text-text-7 font-bold mb-3">
                {t.subsLang}
              </div>
              <div className="flex gap-2 flex-wrap mb-1.5">
                {subtitles.map((s, i) => (
                  <button
                    key={s.language}
                    type="button"
                    onClick={() => setSubLangIndex(i)}
                    className={`font-ui text-[13px] font-bold px-4 py-2.5 rounded-[9px] cursor-pointer border ${
                      subLangIndex === i
                        ? "bg-accent-soft border-accent text-[#FFAFC6]"
                        : "bg-white/5 border-white/12 text-text-3"
                    }`}
                  >
                    {s.language}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDualSubs((v) => !v)}
                className="w-full flex items-center gap-3 mt-3 bg-transparent border-none p-0 cursor-pointer text-left"
              >
                <span
                  className={`relative w-[38px] h-[22px] rounded-full shrink-0 transition-colors ${
                    dualSubs ? "bg-accent" : "bg-white/18"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${
                      dualSubs ? "translate-x-[19px]" : "translate-x-[3px]"
                    }`}
                  />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-bold">{t.dualSubs}</span>
                  <span className="block text-xs text-text-5 mt-0.5">{t.dualSubsHint}</span>
                </span>
              </button>
            </div>

            {qualityLevels.length > 0 && (
              <div>
                <div className="text-xs tracking-[.12em] uppercase text-text-7 font-bold mb-3">
                  {t.quality}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => selectQuality(-1)}
                    className={`font-ui text-[13px] font-bold px-4 py-2.5 rounded-[9px] cursor-pointer border ${
                      currentLevel === -1
                        ? "bg-accent-soft border-accent text-[#FFAFC6]"
                        : "bg-white/5 border-white/12 text-text-3"
                    }`}
                  >
                    Auto
                  </button>
                  {qualityLevels.map((q) => (
                    <button
                      key={q.index}
                      type="button"
                      onClick={() => selectQuality(q.index)}
                      className={`font-ui text-[13px] font-bold px-4 py-2.5 rounded-[9px] cursor-pointer border ${
                        currentLevel === q.index
                          ? "bg-accent-soft border-accent text-[#FFAFC6]"
                          : "bg-white/5 border-white/12 text-text-3"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de limite de telas */}
      {showLimitModal && (
        <div className="absolute inset-0 z-40 bg-[rgba(5,5,9,.85)] backdrop-blur flex items-center justify-center p-6">
          <div className="w-[440px] max-w-full bg-[#14141D] border border-white/12 rounded-[20px] p-7 sm:p-9 text-center dh-fade-in">
            <div className="flex gap-2 justify-center mb-6">
              {Array.from({ length: maxAllowedScreens }).map((_, i) => (
                <div
                  key={i}
                  className="w-14 h-10 rounded-[7px] border-2 border-accent bg-accent-soft flex items-center justify-center text-accent text-sm"
                >
                  ▶
                </div>
              ))}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 leading-snug">{t.limitTitle}</h2>
            <p className="text-sm sm:text-[15px] text-text-5 leading-relaxed mb-7">{t.limitBody}</p>
            <button
              type="button"
              onClick={() => router.push("/plano")}
              className="w-full bg-accent border-none text-white font-ui font-extrabold text-sm sm:text-[15px] py-3.5 rounded-[10px] cursor-pointer mb-2.5"
            >
              {t.limitCta}
            </button>
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="w-full bg-transparent border border-white/16 text-text-3 font-ui font-semibold text-sm sm:text-[15px] py-3.5 rounded-[10px] cursor-pointer"
            >
              {t.gotIt}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
