"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GenreOption = { id: string; name: string };

type DramaFormValues = {
  id?: string;
  titlePortuguese: string;
  titleOriginal: string;
  synopsis: string;
  countryOrigin: string;
  releaseYear: number;
  posterUrl: string;
  bannerUrl: string;
  rating: string;
  status: string;
  genreIds: string[];
};

const COUNTRIES = ["KR", "CN", "JP", "TW", "TH"];

export function DramaForm({
  initial,
  allGenres,
}: {
  initial: DramaFormValues | null;
  allGenres: GenreOption[];
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [values, setValues] = useState<DramaFormValues>(
    initial ?? {
      titlePortuguese: "",
      titleOriginal: "",
      synopsis: "",
      countryOrigin: "KR",
      releaseYear: new Date().getFullYear(),
      posterUrl: "linear-gradient(160deg, #5B2A9E 0%, #170B2B 100%)",
      bannerUrl: "linear-gradient(160deg, #5B2A9E 0%, #170B2B 100%)",
      rating: "",
      status: "DRAFT",
      genreIds: [],
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [genres, setGenres] = useState<GenreOption[]>(allGenres);
  const [creatingGenre, setCreatingGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [genreError, setGenreError] = useState("");
  const newGenreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingGenre) newGenreInputRef.current?.focus();
  }, [creatingGenre]);

  function toggleGenre(id: string) {
    setValues((v) => ({
      ...v,
      genreIds: v.genreIds.includes(id) ? v.genreIds.filter((g) => g !== id) : [...v.genreIds, id],
    }));
  }

  async function createGenre() {
    const name = newGenreName.trim();
    if (!name) {
      setCreatingGenre(false);
      setGenreError("");
      return;
    }
    setGenreError("");
    const res = await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setGenreError(res.status === 409 ? "Esse gênero já existe." : "Não foi possível criar o gênero.");
      return;
    }
    const data = await res.json();
    setGenres((g) => [...g, data.genre]);
    setValues((v) => ({ ...v, genreIds: [...v.genreIds, data.genre.id] }));
    setNewGenreName("");
    setCreatingGenre(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      titlePortuguese: values.titlePortuguese,
      titleOriginal: values.titleOriginal || null,
      synopsis: values.synopsis,
      countryOrigin: values.countryOrigin,
      releaseYear: Number(values.releaseYear),
      posterUrl: values.posterUrl,
      bannerUrl: values.bannerUrl,
      rating: values.rating ? Number(values.rating) : null,
      status: values.status,
      genreIds: values.genreIds,
    };

    const res = await fetch(isEdit ? `/api/admin/dramas/${initial!.id}` : "/api/admin/dramas", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setError("Não foi possível salvar. Confira os campos.");
      setSaving(false);
      return;
    }

    if (isEdit) {
      router.refresh();
      setSaving(false);
    } else {
      const data = await res.json();
      router.push(`/admin/dramas/${data.drama.id}`);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Excluir este dorama e todos os episódios? Essa ação não pode ser desfeita.")) return;
    await fetch(`/api/admin/dramas/${initial!.id}`, { method: "DELETE" });
    router.push("/admin/dramas");
  }

  const inputClass =
    "w-full bg-white/5 border border-white/14 rounded-[10px] px-4 py-2.5 text-sm text-white outline-none focus:border-accent";
  const labelClass = "text-xs font-semibold text-text-4 mb-1.5 block";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-[640px]">
      <div>
        <label className={labelClass}>Título (português)</label>
        <input
          className={inputClass}
          value={values.titlePortuguese}
          onChange={(e) => setValues((v) => ({ ...v, titlePortuguese: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Título original</label>
        <input
          className={inputClass}
          value={values.titleOriginal}
          onChange={(e) => setValues((v) => ({ ...v, titleOriginal: e.target.value }))}
        />
      </div>
      <div>
        <label className={labelClass}>Sinopse</label>
        <textarea
          className={inputClass}
          rows={4}
          value={values.synopsis}
          onChange={(e) => setValues((v) => ({ ...v, synopsis: e.target.value }))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>País</label>
          <select
            className={inputClass}
            value={values.countryOrigin}
            onChange={(e) => setValues((v) => ({ ...v, countryOrigin: e.target.value }))}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c} className="bg-[#14141D] text-white">
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Ano de lançamento</label>
          <input
            type="number"
            className={inputClass}
            value={values.releaseYear}
            onChange={(e) => setValues((v) => ({ ...v, releaseYear: Number(e.target.value) }))}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Poster (URL ou gradiente CSS)</label>
          <input
            className={inputClass}
            value={values.posterUrl}
            onChange={(e) => setValues((v) => ({ ...v, posterUrl: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Banner (URL ou gradiente CSS)</label>
          <input
            className={inputClass}
            value={values.bannerUrl}
            onChange={(e) => setValues((v) => ({ ...v, bannerUrl: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nota (0-10)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={10}
            className={inputClass}
            value={values.rating}
            onChange={(e) => setValues((v) => ({ ...v, rating: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={inputClass}
            value={values.status}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
          >
            <option value="DRAFT" className="bg-[#14141D] text-white">
              Rascunho
            </option>
            <option value="PUBLISHED" className="bg-[#14141D] text-white">
              Publicado
            </option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Gêneros</label>
        <div className="flex flex-wrap gap-2 items-center">
          {genres.map((g) => {
            const active = values.genreIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  active ? "bg-accent border-accent text-white" : "bg-white/5 border-white/14 text-text-3"
                }`}
              >
                {g.name}
              </button>
            );
          })}
          {creatingGenre ? (
            <input
              ref={newGenreInputRef}
              type="text"
              value={newGenreName}
              onChange={(e) => setNewGenreName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createGenre();
                } else if (e.key === "Escape") {
                  setCreatingGenre(false);
                  setNewGenreName("");
                  setGenreError("");
                }
              }}
              onBlur={createGenre}
              placeholder="Nome do gênero"
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-accent bg-white/5 text-white outline-none w-[140px]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setCreatingGenre(true)}
              title="Adicionar gênero"
              className="text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full border border-dashed border-white/25 text-text-5 hover:border-accent hover:text-accent cursor-pointer"
            >
              +
            </button>
          )}
        </div>
        {genreError && <p className="text-xs text-accent mt-1.5">{genreError}</p>}
        {genres.length === 0 && !creatingGenre && (
          <p className="text-xs text-text-7 mt-1.5">Nenhum gênero cadastrado ainda.</p>
        )}
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-accent text-white font-semibold text-sm px-5 py-2.5 rounded-[10px] cursor-pointer disabled:opacity-50"
        >
          {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar dorama"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-transparent border border-white/16 text-text-3 font-semibold text-sm px-4 py-2.5 rounded-[10px] cursor-pointer"
          >
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
