"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Logo } from "@/components/ui/Logo";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { BASE_PRICE_BRL, EXTRA_SCREEN_PRICE_BRL, MAX_EXTRA_SCREENS, formatBRL } from "@/lib/pricing";

export default function PlanoPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [extra, setExtra] = useState(0);

  const total = useMemo(() => BASE_PRICE_BRL + extra * EXTRA_SCREEN_PRICE_BRL, [extra]);
  const totalScreens = 1 + extra;
  const plural = (n: number) => (n === 1 ? t.ntel[0] : t.ntel[1]);

  return (
    <div className="min-h-screen bg-bg-2 px-6 md:px-14 py-10 md:py-12 pb-16 dh-fade-in">
      <Link href="/" className="mb-11 inline-flex">
        <Logo />
      </Link>

      <div className="max-w-[900px] mx-auto">
        <Stepper step={2} />
        <div className="text-xs tracking-[.14em] uppercase text-text-7 font-bold mb-3">
          {t.step2}
        </div>
        <h1 className="font-display text-[28px] md:text-[34px] font-bold mb-10 leading-[1.15]">
          {t.planTitle}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6 items-start">
          <div
            className="relative overflow-hidden rounded-[18px] border border-accent-border p-8"
            style={{ background: "linear-gradient(165deg, #1B1522 0%, #121019 100%)" }}
          >
            <div className="absolute top-0 right-0 bg-accent text-[11px] font-extrabold tracking-[.1em] uppercase px-4 py-[7px] rounded-bl-xl">
              {t.onlyPlan}
            </div>
            <div className="font-display text-2xl font-bold mb-1.5">{t.planName}</div>
            <div className="text-sm text-text-5 mb-[26px]">{t.planTag}</div>

            <div className="flex flex-col gap-3 pb-[26px] border-b border-white/9">
              {t.planIncludes.map((item) => (
                <div key={item} className="flex gap-2.5 items-center">
                  <span className="text-accent font-extrabold text-sm">✓</span>
                  <span className="text-[15px] text-text-2">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-[26px]">
              <div className="text-[13px] font-bold tracking-[.1em] uppercase text-text-7 mb-2">
                {t.extraScreens}
              </div>
              <div className="text-sm text-text-5 leading-relaxed mb-5">{t.extraHelp}</div>
              <div className="flex items-center justify-between bg-white/4 border border-white/10 rounded-[14px] px-5 py-[18px]">
                <div>
                  <div className="text-[17px] font-bold">
                    {totalScreens} {plural(totalScreens)}
                  </div>
                  <div className="text-[13px] text-text-5 mt-[3px]">
                    {extra} / {MAX_EXTRA_SCREENS} {lang === "pt" ? "extras" : "extra"}
                  </div>
                </div>
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setExtra((v) => Math.max(0, v - 1))}
                    disabled={extra === 0}
                    className="w-10 h-10 rounded-[10px] bg-white/7 border border-white/16 text-white text-xl font-semibold cursor-pointer disabled:opacity-40 leading-none"
                  >
                    −
                  </button>
                  <span className="font-display text-xl font-bold min-w-[26px] text-center">
                    {totalScreens}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtra((v) => Math.min(MAX_EXTRA_SCREENS, v + 1))}
                    disabled={extra === MAX_EXTRA_SCREENS}
                    className="w-10 h-10 rounded-[10px] bg-accent border-none text-white text-xl font-semibold cursor-pointer disabled:opacity-40 leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/9 rounded-[18px] p-7 lg:sticky lg:top-[90px]">
            <div className="text-xs tracking-[.14em] uppercase text-text-7 font-bold mb-5">
              {t.summary}
            </div>
            <div className="flex justify-between text-[15px] mb-3">
              <span className="text-text-3">{t.planName}</span>
              <span className="font-semibold">{formatBRL(BASE_PRICE_BRL, lang)}</span>
            </div>
            <div className="flex justify-between text-[15px] mb-5">
              <span className="text-text-3">
                {extra} × {t.extraScreens}
              </span>
              <span className="font-semibold">{formatBRL(extra * EXTRA_SCREEN_PRICE_BRL, lang)}</span>
            </div>
            <div className="h-px bg-white/10 mb-5" />
            <div className="flex justify-between items-end mb-6">
              <span className="text-sm text-text-5">{t.perMonth}</span>
              <span className="font-display text-[30px] font-extrabold text-accent">
                {formatBRL(total, lang)}
              </span>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => router.push(`/checkout?extra=${extra}`)}
            >
              {t.goPay}
            </Button>
            <p className="text-xs text-text-8 text-center mt-3.5 leading-relaxed">{t.cancelAny}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
