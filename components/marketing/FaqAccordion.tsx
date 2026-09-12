"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/context";

export function FaqAccordion() {
  const { t } = useLang();
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col gap-2 max-w-[840px]">
      {t.faqs.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className="bg-surface border border-white/8 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex justify-between items-center gap-4 bg-transparent border-none px-[22px] py-5 text-text font-ui text-base font-semibold text-left cursor-pointer"
            >
              <span>{q}</span>
              <span className="text-accent text-xl shrink-0">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="px-[22px] pb-5 text-[15px] leading-relaxed text-text-5 max-w-[660px]">
                {a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
