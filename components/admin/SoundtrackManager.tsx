"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TrackItem = {
  id: string;
  title: string;
  artistName: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  order: number;
};

type TrackDraft = {
  title: string;
  artistName: string;
  audioUrl: string;
  durationSeconds: string;
  order: string;
};

const EMPTY_DRAFT: TrackDraft = { title: "", artistName: "", audioUrl: "", durationSeconds: "", order: "" };

export function SoundtrackManager({ dramaId, tracks }: { dramaId: string; tracks: TrackItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<TrackDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full bg-white/5 border border-white/14 rounded-[9px] px-3 py-2 text-sm text-white outline-none focus:border-accent";

  function startEdit(track: TrackItem) {
    setEditingId(track.id);
    setDraft({
      title: track.title,
      artistName: track.artistName ?? "",
      audioUrl: track.audioUrl ?? "",
      durationSeconds: track.durationSeconds ? String(track.durationSeconds) : "",
      order: String(track.order),
    });
  }

  function startNew() {
    setEditingId("new");
    setDraft({ ...EMPTY_DRAFT, order: String(tracks.length) });
  }

  async function save() {
    setSaving(true);
    const body = {
      title: draft.title,
      artistName: draft.artistName || null,
      audioUrl: draft.audioUrl || null,
      durationSeconds: draft.durationSeconds ? Number(draft.durationSeconds) : null,
      order: draft.order ? Number(draft.order) : 0,
    };

    const url =
      editingId === "new"
        ? `/api/admin/dramas/${dramaId}/soundtrack`
        : `/api/admin/dramas/${dramaId}/soundtrack/${editingId}`;

    await fetch(url, {
      method: editingId === "new" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setEditingId(null);
    router.refresh();
  }

  async function remove(trackId: string) {
    if (!confirm("Excluir esta faixa?")) return;
    await fetch(`/api/admin/dramas/${dramaId}/soundtrack/${trackId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="max-w-[640px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold">Trilha sonora</h2>
        {editingId === null && (
          <button
            type="button"
            onClick={startNew}
            className="text-accent font-semibold text-sm cursor-pointer bg-transparent border-none"
          >
            + Adicionar faixa
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {tracks.map((track) => (
          <div key={track.id} className="bg-surface border border-white/8 rounded-xl p-4">
            {editingId === track.id ? (
              <TrackEditForm draft={draft} setDraft={setDraft} inputClass={inputClass} />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold flex items-center gap-2">
                    {track.title}
                    {!track.audioUrl && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/8 text-text-5 shrink-0">
                        sem áudio
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-6 truncate">{track.artistName || "artista desconhecido"}</div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(track)}
                    className="text-accent font-semibold text-xs cursor-pointer bg-transparent border-none"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(track.id)}
                    className="text-text-5 font-semibold text-xs cursor-pointer bg-transparent border-none"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
            {editingId === track.id && (
              <TrackFormActions saving={saving} onSave={save} onCancel={() => setEditingId(null)} />
            )}
          </div>
        ))}
        {tracks.length === 0 && editingId !== "new" && (
          <p className="text-sm text-text-5">Nenhuma faixa cadastrada ainda.</p>
        )}
      </div>

      {editingId === "new" && (
        <div className="bg-surface border border-accent-border rounded-xl p-4">
          <TrackEditForm draft={draft} setDraft={setDraft} inputClass={inputClass} />
          <TrackFormActions saving={saving} onSave={save} onCancel={() => setEditingId(null)} />
        </div>
      )}
    </div>
  );
}

function TrackEditForm({
  draft,
  setDraft,
  inputClass,
}: {
  draft: TrackDraft;
  setDraft: (d: TrackDraft) => void;
  inputClass: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Título da faixa"
          className={inputClass}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <input
          placeholder="Artista"
          className={inputClass}
          value={draft.artistName}
          onChange={(e) => setDraft({ ...draft, artistName: e.target.value })}
        />
      </div>
      <input
        placeholder="URL do áudio (opcional — deixe em branco para não tocar)"
        className={inputClass}
        value={draft.audioUrl}
        onChange={(e) => setDraft({ ...draft, audioUrl: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Duração (segundos)"
          className={inputClass}
          value={draft.durationSeconds}
          onChange={(e) => setDraft({ ...draft, durationSeconds: e.target.value })}
        />
        <input
          type="number"
          placeholder="Ordem"
          className={inputClass}
          value={draft.order}
          onChange={(e) => setDraft({ ...draft, order: e.target.value })}
        />
      </div>
    </div>
  );
}

function TrackFormActions({
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
