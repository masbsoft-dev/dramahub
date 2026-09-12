"use client";

import { useState, useTransition } from "react";
import { useLang } from "@/lib/i18n/context";

export function FavoriteButton({ dramaId, initialFavorite }: { dramaId: string; initialFavorite: boolean }) {
  const { t } = useLang();
  const [fav, setFav] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dramaId }),
      }).catch(() => setFav(!next));
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`font-ui font-bold text-[15px] md:text-base px-5 md:px-6 py-3.5 rounded-[10px] cursor-pointer border transition-colors ${
        fav
          ? "bg-accent border-accent text-white"
          : "bg-white/8 border-white/18 text-white hover:bg-white/12"
      }`}
    >
      {fav ? `✓ ${t.faved}` : `+ ${t.fav}`}
    </button>
  );
}
