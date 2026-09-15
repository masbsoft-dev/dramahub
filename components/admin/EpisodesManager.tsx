"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guessFormat, parsePlaylistText } from "@/lib/m3u-parser";

type Subtitle = { language: string; url: string };
type EpisodeItem = {
  id: string;
  episodeNumber: number;
  title: string | null;
  posterUrl: string | null;
  manifestUrl: string;
  format: string;
  durationSeconds: number | null;
  subtitles: Subtitle[];
};

type EpisodeDraft = {
  episodeNumber: string;
  title: string;
  posterUrl: string;
  manifestUrl: string;
  format: string;
  durationHms: string; // "HH:MM:SS" ou "MM:SS"
  subtitlesText: string; // "pt-BR|url\nen-US|url"
};

const EMPTY_DRAFT: EpisodeDraft = {
  episodeNumber: "",
  title: "",
  posterUrl: "",
  manifestUrl: "",
  format: "HLS",
  durationHms: "",
  subtitlesText: "",
};

const FORMAT_LABELS: Record<string, string> = {
  HLS: "HLS (.m3u8)",
  MP4: "MP4 (arquivo único)",
  DASH: "DASH (.mpd) — sem player ainda",
};

function secondsToHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Aceita "HH:MM:SS" ou "MM:SS". Retorna null se vazio ou invalido. */
function hmsToSeconds(value: string): number | null {
  const parts = value.trim().split(":").map((p) => p.trim());
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;

  const nums = parts.map(Number);
  const seconds =
    nums.length === 3
      ? nums[0] * 3600 + nums[1] * 60 + nums[2]
      : nums.length === 2
        ? nums[0] * 60 + nums[1]
        : nums[0];

  return seconds > 0 ? seconds : null;
}

function parseSubtitlesText(text: string): Subtitle[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [language, url] = line.split("|").map((s) => s.trim());
      return { language, url };
    })
    .filter((s) => s.language && s.url);
}

function subtitlesToText(subtitles: Subtitle[]): string {
  return subtitles.map((s) => `${s.language}|${s.url}`).join("\n");
}

type BulkItem = { url: string; posterUrl: string | null };

/** Se o texto colado for uma playlist M3U/M3U8 (#EXTM3U/#EXTINF), extrai a
 * URL de stream e o tvg-logo (vira o poster do episodio) de cada entrada, na
 * ordem em que aparecem; senao, trata cada linha como uma URL direta (um
 * link por linha, sem poster). */
function extractBulkItems(text: string): BulkItem[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("#EXTM3U") || trimmed.includes("#EXTINF")) {
    try {
      return parsePlaylistText(text).map((item) => ({ url: item.streamUrl, posterUrl: item.logoUrl }));
    } catch {
      return [];
    }
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url) => ({ url, posterUrl: null }));
}

export function EpisodesManager({
  dramaId,
  seasonId,
  episodes,
}: {
  dramaId: string;
  seasonId: string;
  episodes: EpisodeItem[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<EpisodeDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPosterUrl, setBulkPosterUrl] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkStatus, setBulkStatus] = useState("");

  const bulkItems = extractBulkItems(bulkText);

  async function probeDuration(manifestUrl: string, format: "HLS" | "MP4"): Promise<number | null> {
    try {
      const res = await fetch("/api/admin/probe-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifestUrl, format }),
      });
      const data = await res.json().catch(() => null);
      return res.ok ? (data?.durationSeconds ?? null) : null;
    } catch {
      return null;
    }
  }

  async function importBulk() {
    if (bulkItems.length === 0) return;
    setBulkImporting(true);
    setBulkStatus("");

    if (bulkPosterUrl.trim()) {
      await fetch(`/api/admin/dramas/${dramaId}/seasons/${seasonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posterUrl: bulkPosterUrl.trim() }),
      }).catch(() => null);
    }

    const failedLines: number[] = [];
    for (let i = 0; i < bulkItems.length; i++) {
      setBulkProgress({ current: i + 1, total: bulkItems.length });
      const { url: manifestUrl, posterUrl } = bulkItems[i];
      const episodeNumber = episodes.length + i + 1;
      const format = guessFormat(manifestUrl);
      const durationSeconds = await probeDuration(manifestUrl, format);
      try {
        const res = await fetch(`/api/admin/dramas/${dramaId}/seasons/${seasonId}/episodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episodeNumber,
            title: String(episodeNumber).padStart(2, "0"),
            posterUrl,
            manifestUrl,
            format,
            durationSeconds,
            subtitles: [],
          }),
        });
        if (!res.ok) failedLines.push(i + 1);
      } catch {
        failedLines.push(i + 1);
      }
    }

    setBulkImporting(false);
    setBulkProgress(null);
    if (failedLines.length === 0) {
      setBulkText("");
      setBulkPosterUrl("");
      setBulkOpen(false);
    } else {
      setBulkStatus(
        `${bulkItems.length - failedLines.length} de ${bulkItems.length} importados. Falha na(s) linha(s): ${failedLines.join(", ")}.`
      );
    }
    router.refresh();
  }

  const inputClass =
    "w-full bg-white/5 border border-white/14 rounded-[9px] px-3 py-2 text-sm text-white outline-none focus:border-accent";

  function startEdit(ep: EpisodeItem) {
    setEditingId(ep.id);
    setDraft({
      episodeNumber: String(ep.episodeNumber),
      title: ep.title ?? "",
      posterUrl: ep.posterUrl ?? "",
      manifestUrl: ep.manifestUrl,
      format: ep.format,
      durationHms: ep.durationSeconds ? secondsToHms(ep.durationSeconds) : "",
      subtitlesText: subtitlesToText(ep.subtitles),
    });
  }

  function startNew() {
    setEditingId("new");
    setDraft({ ...EMPTY_DRAFT, episodeNumber: String(episodes.length + 1) });
  }

  async function save() {
    setSaving(true);
    const body = {
      episodeNumber: Number(draft.episodeNumber),
      title: draft.title || null,
      posterUrl: draft.posterUrl || null,
      manifestUrl: draft.manifestUrl,
      format: draft.format,
      durationSeconds: draft.durationHms ? hmsToSeconds(draft.durationHms) : null,
      subtitles: parseSubtitlesText(draft.subtitlesText),
    };

    const url =
      editingId === "new"
        ? `/api/admin/dramas/${dramaId}/seasons/${seasonId}/episodes`
        : `/api/admin/dramas/${dramaId}/seasons/${seasonId}/episodes/${editingId}`;

    await fetch(url, {
      method: editingId === "new" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setEditingId(null);
    router.refresh();
  }

  async function remove(episodeId: string) {
    if (!confirm("Excluir este episódio?")) return;
    await fetch(`/api/admin/dramas/${dramaId}/seasons/${seasonId}/episodes/${episodeId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="max-w-[640px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold">Episódios</h2>
        {editingId === null && !bulkOpen && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="text-accent font-semibold text-sm cursor-pointer bg-transparent border-none"
            >
              Importar lista de links
            </button>
            <button
              type="button"
              onClick={startNew}
              className="text-accent font-semibold text-sm cursor-pointer bg-transparent border-none"
            >
              + Adicionar episódio
            </button>
          </div>
        )}
      </div>

      {bulkOpen && (
        <div className="bg-surface border border-accent-border rounded-xl p-4 mb-4">
          <p className="text-xs text-text-6 mb-2">
            Cole uma URL por linha (ou o conteúdo de uma playlist M3U/M3U8 — é detectado
            automaticamente), na ordem dos episódios — a primeira linha/item vira o Ep.{" "}
            {episodes.length + 1}, e assim por diante. O formato (HLS/MP4) e a duração de cada
            episódio são detectados automaticamente a partir do link.
          </p>
          <textarea
            placeholder={
              "https://.../ep1.m3u8\nhttps://.../ep2.m3u8\nhttps://.../ep3.mp4\n\nou cole uma playlist:\n#EXTM3U\n#EXTINF:-1,Episódio 1\nhttps://.../ep1.m3u8"
            }
            className={inputClass}
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <input
            placeholder="URL da capa desta temporada (opcional)"
            className={`${inputClass} mt-3`}
            value={bulkPosterUrl}
            onChange={(e) => setBulkPosterUrl(e.target.value)}
          />
          {bulkStatus && <p className="text-xs text-accent mt-2">{bulkStatus}</p>}
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={importBulk}
              disabled={bulkImporting || bulkItems.length === 0}
              className="bg-accent text-white font-semibold text-xs px-4 py-2 rounded-[8px] cursor-pointer disabled:opacity-50"
            >
              {bulkImporting
                ? `Importando… (${bulkProgress?.current ?? 0}/${bulkProgress?.total ?? bulkItems.length})`
                : `Importar ${bulkItems.length || ""} episódio${bulkItems.length === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkOpen(false);
                setBulkText("");
                setBulkPosterUrl("");
                setBulkStatus("");
              }}
              disabled={bulkImporting}
              className="bg-transparent border border-white/16 text-text-3 font-semibold text-xs px-4 py-2 rounded-[8px] cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {episodes.map((ep) => (
          <div key={ep.id} className="bg-surface border border-white/8 rounded-xl p-4">
            {editingId === ep.id ? (
              <EpisodeEditForm draft={draft} setDraft={setDraft} inputClass={inputClass} />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold flex items-center gap-2">
                    Ep. {ep.episodeNumber} — {ep.title || "sem título"}
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/8 text-text-5 shrink-0">
                      {ep.format}
                    </span>
                  </div>
                  <div className="text-xs text-text-6 truncate">{ep.manifestUrl}</div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(ep)}
                    className="text-accent font-semibold text-xs cursor-pointer bg-transparent border-none"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(ep.id)}
                    className="text-text-5 font-semibold text-xs cursor-pointer bg-transparent border-none"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
            {editingId === ep.id && (
              <EpisodeFormActions saving={saving} onSave={save} onCancel={() => setEditingId(null)} />
            )}
          </div>
        ))}
        {episodes.length === 0 && editingId !== "new" && (
          <p className="text-sm text-text-5">Nenhum episódio ainda.</p>
        )}
      </div>

      {editingId === "new" && (
        <div className="bg-surface border border-accent-border rounded-xl p-4">
          <EpisodeEditForm draft={draft} setDraft={setDraft} inputClass={inputClass} />
          <EpisodeFormActions saving={saving} onSave={save} onCancel={() => setEditingId(null)} />
        </div>
      )}
    </div>
  );
}

function EpisodeEditForm({
  draft,
  setDraft,
  inputClass,
}: {
  draft: EpisodeDraft;
  setDraft: (d: EpisodeDraft) => void;
  inputClass: string;
}) {
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState("");

  async function detectDuration() {
    if (!draft.manifestUrl.trim()) {
      setProbeError("Informe a URL antes de detectar.");
      return;
    }
    setProbing(true);
    setProbeError("");
    try {
      const res = await fetch("/api/admin/probe-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifestUrl: draft.manifestUrl, format: draft.format }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.durationSeconds) {
        setProbeError("Não foi possível detectar automaticamente. Informe manualmente.");
        return;
      }
      setDraft({ ...draft, durationHms: secondsToHms(data.durationSeconds) });
    } catch {
      setProbeError("Não foi possível detectar automaticamente. Informe manualmente.");
    } finally {
      setProbing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input
          placeholder="URL do manifesto/arquivo (.m3u8 ou .mp4)"
          className={inputClass}
          value={draft.manifestUrl}
          onChange={(e) => setDraft({ ...draft, manifestUrl: e.target.value })}
        />
        <select
          className={inputClass}
          value={draft.format}
          onChange={(e) => setDraft({ ...draft, format: e.target.value })}
        >
          {Object.entries(FORMAT_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-[#14141D] text-white">
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Número do episódio"
          className={inputClass}
          value={draft.episodeNumber}
          onChange={(e) => setDraft({ ...draft, episodeNumber: e.target.value })}
        />
        <div className="flex gap-2">
          <input
            placeholder="Duração (hh:mm:ss)"
            className={inputClass}
            value={draft.durationHms}
            onChange={(e) => setDraft({ ...draft, durationHms: e.target.value })}
          />
          <button
            type="button"
            onClick={detectDuration}
            disabled={probing}
            title="Detectar duração automaticamente a partir da URL"
            className="shrink-0 bg-white/8 border border-white/16 text-white text-xs font-semibold px-3 rounded-[9px] cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {probing ? "…" : "Detectar"}
          </button>
        </div>
      </div>
      {probeError && <p className="text-xs text-accent -mt-1">{probeError}</p>}
      <input
        placeholder="Título do episódio"
        className={inputClass}
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />
      <input
        placeholder="URL do poster do episódio (opcional — substitui o poster da temporada na listagem)"
        className={inputClass}
        value={draft.posterUrl}
        onChange={(e) => setDraft({ ...draft, posterUrl: e.target.value })}
      />
      <textarea
        placeholder={"Legendas, uma por linha: pt-BR|https://.../pt.vtt"}
        className={inputClass}
        rows={2}
        value={draft.subtitlesText}
        onChange={(e) => setDraft({ ...draft, subtitlesText: e.target.value })}
      />
    </div>
  );
}

function EpisodeFormActions({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-3 mt-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="bg-accent text-white font-semibold text-xs px-4 py-2 rounded-[8px] cursor-pointer disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="bg-transparent border border-white/16 text-text-3 font-semibold text-xs px-4 py-2 rounded-[8px] cursor-pointer"
      >
        Cancelar
      </button>
    </div>
  );
}
