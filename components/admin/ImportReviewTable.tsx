"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  groupTitle: string | null;
  logoUrl: string | null;
  kind: string;
  status: string;
};

const KIND_LABELS: Record<string, string> = {
  CHANNEL: "Canal",
  MOVIE: "Filme",
  SERIES: "Série",
  UNKNOWN: "?",
};

export function ImportReviewTable({ importId, items }: { importId: string; items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function reclassify(kind: string) {
    startTransition(async () => {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/admin/import/${importId}/items/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  async function skipSelected() {
    startTransition(async () => {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/admin/import/${importId}/items/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "SKIPPED" }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  async function publishSelected() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/import/${importId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: Array.from(selected) }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(`${data.createdDramaIds.length} dorama(s) criado(s) como rascunho.`);
        setSelected(new Set());
        router.refresh();
      } else {
        setMessage("Nada foi importado (selecione filmes/séries pendentes).");
      }
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 bg-surface-2 border border-accent-border rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold">{selected.size} selecionado(s)</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => reclassify("MOVIE")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/8 text-text-3 cursor-pointer"
          >
            Marcar como Filme
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => reclassify("SERIES")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/8 text-text-3 cursor-pointer"
          >
            Marcar como Série
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => reclassify("CHANNEL")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/8 text-text-3 cursor-pointer"
          >
            Marcar como Canal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={skipSelected}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/8 text-text-3 cursor-pointer"
          >
            Pular
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={publishSelected}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-accent text-white cursor-pointer ml-auto"
          >
            {pending ? "…" : "Importar selecionados (rascunho)"}
          </button>
        </div>
      )}
      {message && <p className="text-sm text-success mb-4">{message}</p>}

      <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-7 border-b border-white/8">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Categoria (M3U)</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                </td>
                <td className="px-4 py-3 font-semibold max-w-[360px] truncate">{item.name}</td>
                <td className="px-4 py-3 text-text-5 max-w-[200px] truncate">{item.groupTitle ?? "—"}</td>
                <td className="px-4 py-3 text-text-5">{KIND_LABELS[item.kind] ?? item.kind}</td>
                <td className="px-4 py-3 text-text-5">{item.status}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-text-5">
                  Nenhum item com esse filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
