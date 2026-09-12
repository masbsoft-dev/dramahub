"use client";

import { useState, useTransition } from "react";
import { useLang } from "@/lib/i18n/context";
import { BASE_PRICE_BRL, EXTRA_SCREEN_PRICE_BRL, MAX_EXTRA_SCREENS, formatBRL } from "@/lib/pricing";

export function ManageScreensWidget({ initialExtraScreens }: { initialExtraScreens: number }) {
  const { t, lang } = useLang();
  const [extra, setExtra] = useState(initialExtraScreens);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const totalScreens = 1 + extra;
  const total = BASE_PRICE_BRL + extra * EXTRA_SCREEN_PRICE_BRL;

  function updateExtra(next: number) {
    const clamped = Math.max(0, Math.min(MAX_EXTRA_SCREENS, next));
    const previous = extra;
    setExtra(clamped);
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraScreensCount: clamped }),
      });
      if (!res.ok) {
        setExtra(previous);
        setError(t.errGeneric);
      }
    });
  }

  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-4 mb-4.5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-[15px] font-bold">
            {totalScreens} {totalScreens === 1 ? t.ntel[0] : t.ntel[1]}
          </div>
          <div className="text-[13px] text-text-5 mt-0.5">
            {formatBRL(total, lang)} / {t.month}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateExtra(extra - 1)}
            disabled={pending || extra === 0}
            className="w-9 h-9 rounded-[9px] bg-white/7 border border-white/16 text-white text-lg font-semibold cursor-pointer disabled:opacity-40"
          >
            −
          </button>
          <span className="font-display text-lg font-bold min-w-[20px] text-center">{totalScreens}</span>
          <button
            type="button"
            onClick={() => updateExtra(extra + 1)}
            disabled={pending || extra === MAX_EXTRA_SCREENS}
            className="w-9 h-9 rounded-[9px] bg-accent border-none text-white text-lg font-semibold cursor-pointer disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-accent mt-2">{error}</p>}
    </div>
  );
}
