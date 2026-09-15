"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ImportUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"url" | "file">("file");
  const [sourceLabel, setSourceLabel] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full bg-white/5 border border-white/14 rounded-[10px] px-4 py-2.5 text-sm text-white outline-none focus:border-accent";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, string> = { sourceLabel };

      if (mode === "url") {
        body.url = url;
      } else {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
          setError("Selecione um arquivo .m3u ou .m3u8.");
          setLoading(false);
          return;
        }
        const content = await file.text();
        body.content = content;
        if (!sourceLabel) body.sourceLabel = file.name;
      }

      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setError("Não foi possível processar a playlist. Confira a URL/arquivo.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/admin/import/${data.importId}`);
    } catch {
      setError("Erro inesperado ao importar.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-[480px] mb-10">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer ${
            mode === "file" ? "bg-accent text-white" : "bg-white/5 text-text-4"
          }`}
        >
          Arquivo
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer ${
            mode === "url" ? "bg-accent text-white" : "bg-white/5 text-text-4"
          }`}
        >
          URL
        </button>
      </div>

      <input
        placeholder="Nome/apelido desta importação (opcional)"
        className={inputClass}
        value={sourceLabel}
        onChange={(e) => setSourceLabel(e.target.value)}
      />

      {mode === "file" ? (
        <input ref={fileInputRef} type="file" accept=".m3u,.m3u8,text/plain" className={inputClass} />
      ) : (
        <input
          placeholder="https://.../playlist.m3u"
          className={inputClass}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}

      {error && <p className="text-sm text-accent">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-accent text-white font-semibold text-sm px-5 py-2.5 rounded-[10px] cursor-pointer disabled:opacity-50 w-fit"
      >
        {loading ? "Processando…" : "Importar playlist"}
      </button>
    </form>
  );
}
