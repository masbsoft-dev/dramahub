"use client";

import { useState, useTransition } from "react";
import { useLang } from "@/lib/i18n/context";

const HEART_RED = "#EF4444";

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6 md:w-7 md:h-7"
      fill={active ? HEART_RED : "none"}
      stroke={active ? HEART_RED : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function FavoriteButton({ dramaId, initialFavorite }: { dramaId: string; initialFavorite: boolean }) {
  const { t } = useLang();
  const [fav, setFav] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/favorites", {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dramaId }),
        });
        if (!res.ok) setFav(!next);
      } catch {
        setFav(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={fav ? t.faved : t.fav}
      aria-label={fav ? t.faved : t.fav}
      className="w-11 h-11 md:w-12 md:h-12 rounded-[10px] cursor-pointer bg-transparent border-none flex items-center justify-center text-white/70 hover:text-white transition-colors"
    >
      <HeartIcon active={fav} />
    </button>
  );
}
