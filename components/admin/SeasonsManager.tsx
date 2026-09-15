"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EpisodesManager } from "./EpisodesManager";

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

type SeasonItem = {
  id: string;
  seasonNumber: number;
  title: string | null;
  posterUrl: string | null;
  synopsis: string | null;
  episodes: EpisodeItem[];
};

type SeasonDraft = { title: string; posterUrl: string; synopsis: string };

const EMPTY_DRAFT: SeasonDraft = { title: "", posterUrl: "", synopsis: "" };

export function SeasonsManager({ dramaId, seasons }: { dramaId: string; seasons: SeasonItem[] }) {
  const router = useRouter();
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SeasonDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  function toggleExpanded(seasonId: string) {
    setExpandedSeasonId((prev) => (prev === seasonId ? null : seasonId));
  }

  const inputClass =
    "w-full bg-white/5 border border-white/14 rounded-[9px] px-3 py-2 text-sm text-white outline-none focus:border-accent";

  function startEdit(season: SeasonItem) {
    setEditingSeasonId(season.id);
    setDraft({
      title: season.title ?? "",
      posterUrl: season.posterUrl ?? "",
      synopsis: season.synopsis ?? "",
    });
  }

  async function saveSeason(seasonId: string) {
    setSaving(true);
    await fetch(`/api/admin/dramas/${dramaId}/seasons/${seasonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title || null,
        posterUrl: draft.posterUrl || null,
        synopsis: draft.synopsis || null,
      }),
    });
    setSaving(false);
    setEditingSeasonId(null);
    router.refresh();
  }

  async function addSeason() {
    setCreating(true);
    await fetch(`/api/admin/dramas/${dramaId}/seasons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setCreating(false);
    router.refresh();
  }

  async function removeSeason(seasonId: string, seasonNumber: number) {
    if (
      !confirm(
        `Excluir a Temporada ${seasonNumber}? Todos os episódios dela também serão excluídos.`
      )
    )
      return;
    await fetch(`/api/admin/dramas/${dramaId}/seasons/${seasonId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="max-w-[720px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold">Temporadas</h2>
        <button
          type="button"
          onClick={addSeason}
          disabled={creating}
          className="text-accent font-semibold text-sm cursor-pointer bg-transparent border-none disabled:opacity-50"
        >
          {creating ? "Criando…" : "+ Adicionar temporada"}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {seasons.map((season) => (
          <div key={season.id} className="bg-surface border border-white/8 rounded-xl p-4">
            <div
              className="flex items-center justify-between gap-3 mb-3 cursor-pointer select-none"
              onClick={() => toggleExpanded(season.id)}
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <span
                  className={`text-text-6 text-xs transition-transform ${
                    expandedSeasonId === season.id ? "rotate-90" : ""
                  }`}
                >
                  ▸
                </span>
                <div>
                  <div className="text-sm font-bold">
                    Temporada {season.seasonNumber}
                    {season.title ? ` — ${season.title}` : ""}
                  </div>
                  <div className="text-xs text-text-6">
                    {season.episodes.length} episódio{season.episodes.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editingSeasonId === season.id) setEditingSeasonId(null);
                    else startEdit(season);
                  }}
                  className="text-accent font-semibold text-xs cursor-pointer bg-transparent border-none"
                >
                  {editingSeasonId === season.id ? "Fechar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSeason(season.id, season.seasonNumber);
                  }}
                  className="text-text-5 font-semibold text-xs cursor-pointer bg-transparent border-none"
                >
                  Excluir temporada
                </button>
              </div>
            </div>

            {editingSeasonId === season.id && (
              <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-white/8">
                <input
                  placeholder="Título da temporada (opcional)"
                  className={inputClass}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
                <input
                  placeholder="URL da capa da temporada (opcional)"
                  className={inputClass}
                  value={draft.posterUrl}
                  onChange={(e) => setDraft({ ...draft, posterUrl: e.target.value })}
                />
                <textarea
                  placeholder="Sinopse da temporada (opcional)"
                  className={inputClass}
                  rows={2}
                  value={draft.synopsis}
                  onChange={(e) => setDraft({ ...draft, synopsis: e.target.value })}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => saveSeason(season.id)}
                    disabled={saving}
                    className="bg-accent text-white font-semibold text-xs px-4 py-2 rounded-[8px] cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSeasonId(null)}
                    className="bg-transparent border border-white/16 text-text-3 font-semibold text-xs px-4 py-2 rounded-[8px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {expandedSeasonId === season.id && (
              <EpisodesManager dramaId={dramaId} seasonId={season.id} episodes={season.episodes} />
            )}
          </div>
        ))}
        {seasons.length === 0 && (
          <p className="text-sm text-text-5">Nenhuma temporada ainda — adicione a primeira acima.</p>
        )}
      </div>
    </div>
  );
}
