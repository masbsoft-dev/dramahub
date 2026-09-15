"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CastItem = {
  id: string;
  actorName: string;
  roleName: string | null;
  photoUrl: string | null;
  order: number;
};

type CastDraft = { actorName: string; roleName: string; photoUrl: string; order: string };

const EMPTY_DRAFT: CastDraft = { actorName: "", roleName: "", photoUrl: "", order: "" };

export function CastManager({ dramaId, members }: { dramaId: string; members: CastItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<CastDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full bg-white/5 border border-white/14 rounded-[9px] px-3 py-2 text-sm text-white outline-none focus:border-accent";

  function startEdit(member: CastItem) {
    setEditingId(member.id);
    setDraft({
      actorName: member.actorName,
      roleName: member.roleName ?? "",
      photoUrl: member.photoUrl ?? "",
      order: String(member.order),
    });
  }

  function startNew() {
    setEditingId("new");
    setDraft({ ...EMPTY_DRAFT, order: String(members.length) });
  }

  async function save() {
    setSaving(true);
    const body = {
      actorName: draft.actorName,
      roleName: draft.roleName || null,
      photoUrl: draft.photoUrl || null,
      order: draft.order ? Number(draft.order) : 0,
    };

    const url =
      editingId === "new"
        ? `/api/admin/dramas/${dramaId}/cast`
        : `/api/admin/dramas/${dramaId}/cast/${editingId}`;

    await fetch(url, {
      method: editingId === "new" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setEditingId(null);
    router.refresh();
  }

  async function remove(castId: string) {
    if (!confirm("Excluir este ator do elenco?")) return;
    await fetch(`/api/admin/dramas/${dramaId}/cast/${castId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="max-w-[640px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold">Elenco</h2>
        {editingId === null && (
          <button
            type="button"
            onClick={startNew}
            className="text-accent font-semibold text-sm cursor-pointer bg-transparent border-none"
          >
            + Adicionar ator
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {members.map((member) => (
          <div key={member.id} className="bg-surface border border-white/8 rounded-xl p-4">
            {editingId === member.id ? (
              <CastEditForm draft={draft} setDraft={setDraft} inputClass={inputClass} />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold">{member.actorName}</div>
                  <div className="text-xs text-text-6 truncate">{member.roleName || "sem papel definido"}</div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(member)}
                    className="text-accent font-semibold text-xs cursor-pointer bg-transparent border-none"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(member.id)}
                    className="text-text-5 font-semibold text-xs cursor-pointer bg-transparent border-none"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
            {editingId === member.id && (
              <CastFormActions saving={saving} onSave={save} onCancel={() => setEditingId(null)} />
            )}
          </div>
        ))}
        {members.length === 0 && editingId !== "new" && (
          <p className="text-sm text-text-5">Nenhum ator cadastrado ainda.</p>
        )}
      </div>

      {editingId === "new" && (
        <div className="bg-surface border border-accent-border rounded-xl p-4">
          <CastEditForm draft={draft} setDraft={setDraft} inputClass={inputClass} />
          <CastFormActions saving={saving} onSave={save} onCancel={() => setEditingId(null)} />
        </div>
      )}
    </div>
  );
}

function CastEditForm({
  draft,
  setDraft,
  inputClass,
}: {
  draft: CastDraft;
  setDraft: (d: CastDraft) => void;
  inputClass: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <input
        placeholder="Nome do ator/atriz"
        className={inputClass}
        value={draft.actorName}
        onChange={(e) => setDraft({ ...draft, actorName: e.target.value })}
      />
      <input
        placeholder="Papel/personagem"
        className={inputClass}
        value={draft.roleName}
        onChange={(e) => setDraft({ ...draft, roleName: e.target.value })}
      />
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input
          placeholder="URL da foto (opcional)"
          className={inputClass}
          value={draft.photoUrl}
          onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })}
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

function CastFormActions({
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
