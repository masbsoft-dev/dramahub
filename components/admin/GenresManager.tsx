"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Genre = { id: string; name: string; _count: { dramas: number } };

export function GenresManager({ genres }: { genres: Genre[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      setError("Nome já existe ou é inválido.");
      return;
    }
    setNewName("");
    router.refresh();
  }

  async function rename(id: string) {
    await fetch(`/api/admin/genres/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este gênero?")) return;
    await fetch(`/api/admin/genres/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="max-w-[520px]">
      <form onSubmit={create} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Novo gênero"
          className="flex-1 bg-white/5 border border-white/14 rounded-[10px] px-4 py-2.5 text-sm text-white outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="bg-accent text-white font-semibold text-sm px-4 py-2.5 rounded-[10px] cursor-pointer"
        >
          Adicionar
        </button>
      </form>
      {error && <p className="text-sm text-accent mb-4">{error}</p>}

      <div className="flex flex-col gap-2">
        {genres.map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between gap-3 bg-surface border border-white/8 rounded-xl px-4 py-3"
          >
            {editingId === g.id ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/14 rounded-[8px] px-3 py-1.5 text-sm text-white outline-none"
                autoFocus
              />
            ) : (
              <span className="text-sm font-semibold">
                {g.name} <span className="text-text-6 font-normal">({g._count.dramas})</span>
              </span>
            )}
            <div className="flex gap-3 shrink-0">
              {editingId === g.id ? (
                <button
                  type="button"
                  onClick={() => rename(g.id)}
                  className="text-accent font-semibold text-xs cursor-pointer bg-transparent border-none"
                >
                  Salvar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(g.id);
                    setEditName(g.name);
                  }}
                  className="text-accent font-semibold text-xs cursor-pointer bg-transparent border-none"
                >
                  Renomear
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(g.id)}
                className="text-text-5 font-semibold text-xs cursor-pointer bg-transparent border-none"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
        {genres.length === 0 && <p className="text-sm text-text-5">Nenhum gênero cadastrado.</p>}
      </div>
    </div>
  );
}
