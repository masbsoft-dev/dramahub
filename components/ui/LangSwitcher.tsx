"use client";

import { useLang } from "@/lib/i18n/context";

export function LangSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex bg-surface-3 rounded-[9px] p-[3px] border border-white/8">
      {(["pt", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`text-xs font-bold px-[13px] py-[6px] rounded-[7px] cursor-pointer transition-colors ${
            lang === l ? "bg-accent text-white" : "bg-transparent text-text-6 hover:text-text-3"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
