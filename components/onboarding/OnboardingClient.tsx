"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/Button";
import { posterStyle } from "@/lib/poster";

type DramaOption = {
  id: string;
  titlePortuguese: string;
  posterUrl: string;
  countryOrigin: string;
};

export function OnboardingClient({ dramas }: { dramas: DramaOption[] }) {
  const { t } = useLang();
  const router = useRouter();
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggleGenre(g: string) {
    setGenres((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function toggleFav(id: string) {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function finish() {
    setSaving(true);
    try {
      await Promise.all(
        Array.from(favs).map((dramaId) =>
          fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dramaId }),
          })
        )
      );
    } finally {
      router.push("/home");
    }
  }

  return (
    <div
      className="min-h-screen px-6 md:px-14 py-14 pb-20 dh-fade-in"
      style={{
        background:
          "radial-gradient(90% 60% at 50% 0%, rgba(255,61,113,.16) 0%, rgba(10,10,15,0) 60%), #0A0A0F",
      }}
    >
      <div className="max-w-[880px] mx-auto text-center">
        <div className="text-xs tracking-[.14em] uppercase text-[#FF7FA2] font-bold mb-3.5">
          {t.welcome}
        </div>
        <h1 className="font-display text-[28px] md:text-[36px] font-bold mb-3 leading-[1.15]">
          {t.onbTitle}
        </h1>
        <p className="text-[15px] md:text-base text-text-5 mb-10">{t.onbSub}</p>

        <div className="flex flex-wrap gap-2.5 justify-center mb-11">
          {t.genres.map((g) => {
            const active = genres.has(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`text-sm font-semibold px-5 py-[11px] rounded-full cursor-pointer transition-colors ${
                  active
                    ? "bg-accent border border-accent text-white"
                    : "bg-white/5 border border-white/14 text-text-3"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>

        {dramas.length > 0 && (
          <div className="text-left mb-9">
            <div className="text-[15px] font-bold mb-4">{t.pickFav}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {dramas.map((d) => {
                const active = favs.has(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleFav(d.id)}
                    className={`bg-surface rounded-xl overflow-hidden cursor-pointer p-0 text-left text-text border-2 ${
                      active ? "border-accent" : "border-white/8"
                    }`}
                  >
                    <div
                      className="h-[150px] flex items-end p-2.5"
                      style={posterStyle(d.posterUrl)}
                    >
                      <span className="font-display text-[11px] font-bold leading-tight text-left">
                        {d.titlePortuguese}
                      </span>
                    </div>
                    <div className="px-2.5 py-2 text-[11px] text-text-5 text-left">
                      {d.countryOrigin === "KR" ? "🇰🇷 K-Drama" : "🇨🇳 C-Drama"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button size="lg" onClick={finish} disabled={saving}>
          {saving ? "…" : t.finish} →
        </Button>
        <div className="mt-3.5">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="bg-transparent border-none text-text-7 font-ui text-sm cursor-pointer underline"
          >
            {t.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
