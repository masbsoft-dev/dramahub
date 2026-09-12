"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { posterStyle } from "@/lib/poster";

type DramaLite = { id: string; titlePortuguese: string; posterUrl: string };

export function WeeklyReleases({ dramas }: { dramas: DramaLite[] }) {
  const { t } = useLang();
  const [day, setDay] = useState(0);

  if (dramas.length === 0) return null;

  // Agrupamento deterministico (nao ha campo de dia-da-semana no schema —
  // secao de "lancamentos semanais" e apenas uma vitrine editorial).
  const buckets = t.weekDays.map((_, dayIndex) =>
    dramas.filter((_, i) => i % t.weekDays.length === dayIndex)
  );
  const rowItems = buckets[day].length ? buckets[day] : dramas.slice(0, 6);

  return (
    <div>
      <div className="flex items-center gap-4.5 mb-4 flex-wrap">
        <div className="font-display text-lg font-semibold">{t.weekly}</div>
        <div className="flex gap-1.5">
          {t.weekDays.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setDay(i)}
              className={`text-[13px] font-bold px-3.5 py-2 rounded-lg cursor-pointer transition-colors ${
                day === i
                  ? "bg-accent-soft border border-accent text-[#FFAFC6]"
                  : "bg-white/5 border border-white/10 text-text-5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3.5 overflow-x-auto pb-2.5 no-scrollbar">
        {rowItems.map((d, i) => (
          <Link
            key={d.id}
            href={`/dramas/${d.id}`}
            className="flex-none w-[180px] text-text no-underline"
          >
            <div
              className="h-[250px] rounded-xl border border-white/10 p-3 flex flex-col justify-between"
              style={posterStyle(d.posterUrl)}
            >
              <span className="self-start text-[10px] font-extrabold tracking-[.08em] uppercase bg-black/55 px-2 py-1 rounded">
                {i === 0 ? t.weekDays[day] : `Ep. ${4 + i}`}
              </span>
              <span className="font-display text-[13px] font-bold leading-tight">
                {d.titlePortuguese}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
