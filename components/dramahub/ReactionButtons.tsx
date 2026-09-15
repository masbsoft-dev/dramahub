"use client";

import { useState, useTransition } from "react";
import { useLang } from "@/lib/i18n/context";

type Reaction = "LIKE" | "DISLIKE" | null;

// Contorno de mao com polegar (Feather "thumbs-up") — o dislike e o mesmo
// path rotacionado 180 graus, evitando manter dois desenhos separados.
const THUMB_PATH =
  "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3";

function ThumbIcon({ down, active }: { down?: boolean; active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6 md:w-7 md:h-7"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={THUMB_PATH} transform={down ? "rotate(180 12 12)" : undefined} />
    </svg>
  );
}

export function ReactionButtons({
  dramaId,
  initialReaction,
}: {
  dramaId: string;
  initialReaction: Reaction;
}) {
  const { t } = useLang();
  const [reaction, setReaction] = useState<Reaction>(initialReaction);
  const [pending, startTransition] = useTransition();

  function react(type: "LIKE" | "DISLIKE") {
    const previous = reaction;
    const next = previous === type ? null : type;
    setReaction(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/reactions", {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next ? { dramaId, type: next } : { dramaId }),
        });
        if (!res.ok) setReaction(previous);
      } catch {
        setReaction(previous);
      }
    });
  }

  const baseClass =
    "w-11 h-11 md:w-12 md:h-12 rounded-[10px] cursor-pointer bg-transparent border-none flex items-center justify-center transition-colors";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => react("LIKE")}
        disabled={pending}
        title={t.like}
        aria-label={t.like}
        className={`${baseClass} ${reaction === "LIKE" ? "text-accent" : "text-white/70 hover:text-white"}`}
      >
        <ThumbIcon active={reaction === "LIKE"} />
      </button>
      <button
        type="button"
        onClick={() => react("DISLIKE")}
        disabled={pending}
        title={t.dislike}
        aria-label={t.dislike}
        className={`${baseClass} ${reaction === "DISLIKE" ? "text-accent" : "text-white/70 hover:text-white"}`}
      >
        <ThumbIcon down active={reaction === "DISLIKE"} />
      </button>
    </div>
  );
}
