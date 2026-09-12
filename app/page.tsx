import Link from "next/link";
import { getLangFromCookies } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safe-query";
import { posterStyle } from "@/lib/poster";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { EmailCapture } from "@/components/marketing/EmailCapture";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

export default async function LandingPage() {
  const lang = await getLangFromCookies();
  const t = dictionaries[lang];

  const heroPosters = await safeQuery(
    () =>
      prisma.drama.findMany({
        orderBy: { createdAt: "asc" },
        take: 3,
        select: { id: true, titlePortuguese: true, posterUrl: true, countryOrigin: true, releaseYear: true },
      }),
    []
  );

  return (
    <div className="bg-bg-2 dh-fade-in">
      <header className="flex items-center justify-between px-6 md:px-10 py-[22px] relative z-10">
        <Logo size="lg" />
        <div className="flex items-center gap-3.5">
          <LangSwitcher />
          <Link href="/entrar">
            <Button variant="secondary">{t.login}</Button>
          </Link>
        </div>
      </header>

      <section
        className="relative px-6 md:px-10 pt-12 md:pt-[70px] pb-16 md:pb-[90px] overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 90% at 78% 10%, rgba(255,61,113,.28) 0%, rgba(10,10,15,0) 58%), linear-gradient(180deg, #121019 0%, #0A0A0F 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[.16] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "100% 7px",
          }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-10 items-start">
          <div className="relative max-w-[640px]">
            <div className="inline-flex items-center gap-2 px-[13px] py-1.5 rounded-full bg-accent-soft border border-accent-border mb-[26px]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent dh-pulse" />
              <span className="text-xs font-bold tracking-[.1em] uppercase text-[#FFAFC6]">
                {t.hotNow}
              </span>
            </div>
            <h1 className="font-display font-extrabold text-[36px] md:text-[56px] leading-[1.04] tracking-[-.02em] mb-5 text-balance">
              {t.heroTitle}
            </h1>
            <p className="text-lg md:text-[19px] leading-[1.55] text-text-4 mb-8 max-w-[520px] text-pretty">
              {t.heroSub}
            </p>
            <EmailCapture />
            <p className="text-[13px] text-text-7 m-0">{t.heroNote}</p>
          </div>

          {heroPosters.length > 0 && (
            <div className="hidden lg:flex gap-4 -rotate-[7deg] opacity-90 shrink-0 -mt-5">
              {heroPosters.map((p, i) => (
                <div
                  key={p.id}
                  className="w-[172px] h-[258px] rounded-2xl border border-white/12 p-3.5 flex flex-col justify-end shadow-[0_30px_60px_rgba(0,0,0,.6)]"
                  style={{ ...posterStyle(p.posterUrl), marginTop: `${i * 34}px` }}
                >
                  <div className="font-display text-[13px] font-bold leading-tight">
                    {p.titlePortuguese}
                  </div>
                  <div className="text-[11px] text-white/70 mt-1">
                    {p.countryOrigin === "KR" ? "🇰🇷" : "🇨🇳"} {p.releaseYear}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 md:px-10 py-16 border-t border-white/7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[22px]">
          {t.perks.map(([title, body], i) => (
            <div key={title} className="bg-surface border border-white/8 rounded-2xl p-7">
              <div className="font-display text-2xl text-accent mb-4">{i + 1}</div>
              <div className="text-[17px] font-bold mb-2 leading-snug">{title}</div>
              <div className="text-sm text-text-5 leading-relaxed">{body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-10 pt-2.5 pb-20">
        <h2 className="font-display text-[28px] font-bold mb-[26px]">FAQ</h2>
        <FaqAccordion />
      </section>
    </div>
  );
}
