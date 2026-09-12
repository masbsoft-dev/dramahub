"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

type SubtitleTrack = { language: string; vttUrl: string };

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
  episodeNumber,
  manifestUrl,
  subtitles,
  resumeAt,
  durationSeconds,
  maxAllowedScreens,
}: {
  episodeId: string;
  dramaId: string;
  dramaTitle: string;
  episodeNumber: number;
  episodeTitle: string | null;
  manifestUrl: string;
  subtitles: SubtitleTrack[];
  resumeAt: number;
  durationSeconds: number | null;
  maxAllowedScreens: number;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const deviceFingerprintRef = useRef<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(resumeAt);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [showGlossary, setShowGlossary] = useState(true);
  const [openMarkerIndex, setOpenMarkerIndex] = useState<number | null>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [subLangIndex, setSubLangIndex] = useState(0); // 0 = pt-BR se existir
  const [dualSubs, setDualSubs] = useState(true);
  const [qualityIndex, setQualityIndex] = useState(0);
  const [activeCue, setActiveCue] = useState<{ primary: string; secondary: string }>({
    primary: "",
    secondary: "",
  });

  const qualities = ["1080p (Full HD)", "720p", "Auto"];
  const wantsPlayRef = useRef(false);

  // ---- Setup HLS ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: import("hls.js").default | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = manifestUrl;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(manifestUrl);
          hls.attachMedia(video);
        }
      });
    }

    return () => {
      hls?.destroy();
    };
  }, [manifestUrl]);

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

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black dh-fade-in"
      style={{ background: "linear-gradient(165deg,#2A1020 0%,#0C0812 55%,#050508 100%)" }}
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
        onPause={() => setPlaying(false)}
        playsInline
      >
        {subtitles.map((s, i) => (
          <track key={s.language} kind="subtitles" srcLang={s.language} src={s.vttUrl} label={s.language} default={i === 0} />
        ))}
      </video>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-[22px] flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent z-10">
        <Link
          href={`/dramas/${dramaId}`}
          className="flex items-center gap-2.5 md:gap-[11px] bg-transparent border-none text-white font-ui text-sm md:text-base font-semibold no-underline"
        >
          <span className="text-lg md:text-[19px]">←</span>
          <span className="truncate max-w-[45vw]">
            {dramaTitle} · <span className="text-text-4">S1:E{episodeNumber}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 bg-white/10 border border-white/18 text-white font-ui text-[13px] md:text-sm font-semibold px-3 md:px-4 py-2 md:py-[9px] rounded-[9px] cursor-pointer"
        >
          ⚙ <span className="hidden sm:inline">{t.settings}</span>
        </button>
      </div>

      {/* Center controls */}
      <div className="absolute inset-0 flex items-center justify-center gap-8 md:gap-14 z-10">
        <button
          type="button"
          onClick={() => seekBy(-10)}
          className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-white/10 border border-white/20 text-white text-xs md:text-[13px] font-bold cursor-pointer"
        >
          ⟲10
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="w-[72px] h-[72px] md:w-[92px] md:h-[92px] rounded-full bg-white/14 border-2 border-white/50 backdrop-blur text-white text-2xl md:text-3xl cursor-pointer flex items-center justify-center"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={() => seekBy(10)}
          className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-white/10 border border-white/20 text-white text-xs md:text-[13px] font-bold cursor-pointer"
        >
          10⟳
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
      <div className="absolute left-0 right-0 bottom-0 p-4 md:p-7 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10">
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
            <span className="hidden sm:inline text-[13px] text-text-5">
              {t.nextEp}: S1:E{episodeNumber + 1}
            </span>
          </div>
          <div className="flex items-center gap-2.5 md:gap-3">
            <button
              type="button"
              onClick={() => seekBy(85)}
              className="bg-white/14 border border-white/22 text-white font-ui text-xs md:text-[13px] font-bold px-3 md:px-4 py-2 md:py-[9px] rounded-lg cursor-pointer"
            >
              {t.skipIntro}
            </button>
          </div>
        </div>
      </div>

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

            <div>
              <div className="text-xs tracking-[.12em] uppercase text-text-7 font-bold mb-3">
                {t.quality}
              </div>
              <div className="flex gap-2 flex-wrap">
                {qualities.map((q, i) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQualityIndex(i)}
                    className={`font-ui text-[13px] font-bold px-4 py-2.5 rounded-[9px] cursor-pointer border ${
                      qualityIndex === i
                        ? "bg-accent-soft border-accent text-[#FFAFC6]"
                        : "bg-white/5 border-white/12 text-text-3"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
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
