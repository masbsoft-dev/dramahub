import Link from "next/link";
import { getLangFromCookies } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safe-query";
import { posterStyle } from "@/lib/poster";
import { BASE_PRICE_BRL, formatBRL } from "@/lib/pricing";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { EmailCapture } from "@/components/marketing/EmailCapture";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { Reveal } from "@/components/ui/Reveal";

export default async function LandingPage() {
  const lang = await getLangFromCookies();
  const t = dictionaries[lang];

  const featured = await safeQuery(
    () =>
      prisma.drama.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          titlePortuguese: true,
          synopsis: true,
          posterUrl: true,
          bannerUrl: true,
          countryOrigin: true,
          releaseYear: true,
          rating: true,
          genres: { take: 2, select: { genre: { select: { name: true } } } },
        },
      }),
    null
  );

  const [catalog, totalCount] = await safeQuery(
    () =>
      Promise.all([
        prisma.drama.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { rating: "desc" },
          take: 40,
          select: {
            id: true,
            titlePortuguese: true,
            posterUrl: true,
            countryOrigin: true,
            rating: true,
          },
        }),
        prisma.drama.count({ where: { status: "PUBLISHED" } }),
      ]),
    [[], 0]
  );

  const krSample = catalog.find((d) => d.countryOrigin === "KR");
  const cnSample = catalog.find((d) => d.countryOrigin === "CN");
  const krCount = catalog.filter((d) => d.countryOrigin === "KR").length;
  const cnCount = catalog.filter((d) => d.countryOrigin === "CN").length;
  const highlights = catalog.slice(0, 10);

  const categories = [
    krSample && {
      href: "/home?country=KR",
      label: t.navK,
      sub: `${krCount}+ ${t.titlesAvailable}`,
      bg: krSample.posterUrl,
    },
    cnSample && {
      href: "/home?country=CN",
      label: t.navC,
      sub: `${cnCount}+ ${t.titlesAvailable}`,
      bg: cnSample.posterUrl,
    },
    {
      href: "/home",
      label: t.catalogComplete,
      sub: t.catalogCompleteSub,
      bg: featured?.posterUrl ?? "linear-gradient(160deg, #5B2A9E 0%, #170B2B 100%)",
    },
  ].filter((c): c is { href: string; label: string; sub: string; bg: string } => !!c);

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
        style={{ background: "linear-gradient(180deg, #121019 0%, #0A0A0F 100%)" }}
      >
        {/* Cinematic backdrop — a soft, darkened wash of the featured title's
            own art, instead of a generic decorative gradient/scanline. */}
        <div className="absolute inset-0 pointer-events-none">
          {featured?.bannerUrl && (
            <div className="absolute inset-0 opacity-[.20]" style={posterStyle(featured.bannerUrl)} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, #0A0A0F 0%, rgba(10,10,15,.93) 32%, rgba(10,10,15,.58) 62%, rgba(10,10,15,.88) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 70% at 88% 0%, rgba(255,61,113,.14) 0%, rgba(10,10,15,0) 60%)",
            }}
          />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-14 items-center">
          <div className="relative max-w-[600px]">
            <div className="flex items-center gap-3 mb-7">
              <span className="w-8 h-px bg-accent" />
              <span className="text-xs font-bold tracking-[.16em] uppercase text-[#FFAFC6]">
                {t.hotNow}
              </span>
            </div>
            <h1 className="font-display font-extrabold text-[34px] md:text-[52px] leading-[1.08] tracking-[-.02em] mb-5 text-balance">
              {t.heroTitle}
            </h1>
            <p className="text-base md:text-lg leading-[1.6] text-text-4 mb-9 max-w-[500px] text-pretty">
              {t.heroSub}
            </p>
            <EmailCapture />
            <p className="text-[13px] text-text-7 m-0">{t.heroNote}</p>
          </div>

          {featured && (
            <Reveal className="hidden lg:block" delay={150}>
              <Link
                href="/entrar"
                className="group relative block w-full h-[460px] rounded-[22px] overflow-hidden border border-white/12 no-underline shadow-[0_40px_90px_rgba(0,0,0,.55)] transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_50px_110px_rgba(255,61,113,.22)]"
              >
                <div
                  className="absolute inset-0 scale-100 transition-transform duration-[6000ms] ease-out group-hover:scale-[1.07]"
                  style={posterStyle(featured.bannerUrl || featured.posterUrl)}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(7,7,11,.96) 0%, rgba(7,7,11,.3) 55%, rgba(7,7,11,.05) 100%)",
                  }}
                />
                <span className="absolute top-5 left-5 text-[11px] font-bold tracking-[.1em] uppercase text-white/85 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/15">
                  {t.heroSpotlightLabel}
                </span>
                {featured.rating && (
                  <span className="absolute top-5 right-5 text-[13px] font-bold text-accent bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/15">
                    ★ {Number(featured.rating).toFixed(1)}
                  </span>
                )}
                <div className="absolute left-6 right-6 bottom-6">
                  {featured.genres.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {featured.genres.map((g) => (
                        <span
                          key={g.genre.name}
                          className="text-[10px] font-bold tracking-[.06em] uppercase text-white/80 bg-white/10 px-2.5 py-1 rounded-full"
                        >
                          {g.genre.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="font-display text-2xl font-bold mb-2 leading-tight">
                    {featured.titlePortuguese}
                  </div>
                  <div className="text-[13px] text-white/60 font-semibold mb-3">
                    {featured.countryOrigin === "KR" ? "🇰🇷" : "🇨🇳"} {featured.releaseYear}
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed line-clamp-2 mb-4">
                    {featured.synopsis}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white group-hover:text-accent transition-colors duration-300">
                    {t.heroSpotlightCta}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            </Reveal>
          )}
        </div>

        {/* Trust bar — inspired by Netflix/HBO Max's reassurance strip right under the hero CTA */}
        <div className="relative flex flex-wrap gap-x-8 gap-y-3 mt-12 md:mt-16 pt-7 border-t border-white/8 text-sm text-text-4 font-semibold">
          {totalCount > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              {totalCount}+ {t.titlesAvailable}
            </span>
          )}
          {t.trustStats.map((stat) => (
            <span key={stat} className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              {stat}
            </span>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="px-6 md:px-10 py-16 border-t border-white/7">
          <Reveal>
            <h2 className="font-display text-[28px] font-bold mb-[26px]">{t.categoriesTitle}</h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[22px]">
            {categories.map((c, i) => (
              <Reveal key={c.href} delay={i * 90}>
                <Link
                  href={c.href}
                  className="group relative h-[220px] rounded-2xl overflow-hidden border border-white/10 no-underline text-text block transition-[border-color,transform] duration-300 hover:border-accent-border hover:-translate-y-1"
                >
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110" style={posterStyle(c.bg)} />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(0deg, rgba(7,7,11,.92) 0%, rgba(7,7,11,.15) 65%)" }}
                  />
                  <div className="absolute left-5 right-5 bottom-5">
                    <div className="font-display text-xl font-bold mb-1">{c.label}</div>
                    <div className="text-xs text-text-4 font-semibold">{c.sub}</div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {highlights.length > 0 && (
        <section className="px-6 md:px-10 py-16 border-t border-white/7">
          <Reveal>
            <h2 className="font-display text-[28px] font-bold mb-[26px]">{t.highlightsTitle}</h2>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {highlights.map((d, i) => (
              <Reveal key={d.id} delay={(i % 5) * 70}>
                <Link
                  href="/entrar"
                  className="group block rounded-xl overflow-hidden border border-white/8 no-underline text-text bg-surface transition-[border-color,transform] duration-300 hover:border-white/20 hover:-translate-y-1"
                >
                  <div className="h-[210px] relative overflow-hidden">
                    <div
                      className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                      style={posterStyle(d.posterUrl)}
                    />
                    {d.rating && (
                      <span className="absolute top-2.5 right-2.5 bg-black/65 backdrop-blur text-[11px] font-bold px-2 py-1 rounded-full text-accent">
                        ★ {Number(d.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 py-2 text-xs font-semibold truncate">{d.titlePortuguese}</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="px-6 md:px-10 py-16 border-t border-white/7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[22px]">
          {t.perks.map(([title, body], i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="group bg-surface border border-white/8 rounded-2xl p-7 h-full transition-[border-color,transform] duration-300 hover:border-accent-border hover:-translate-y-1">
                <div className="font-display text-2xl text-accent mb-4 transition-transform duration-300 group-hover:scale-110 inline-block">
                  {i + 1}
                </div>
                <div className="text-[17px] font-bold mb-2 leading-snug">{title}</div>
                <div className="text-sm text-text-5 leading-relaxed">{body}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-10 py-16 border-t border-white/7">
        <Reveal>
          <h2 className="font-display text-[28px] font-bold mb-[26px]">{t.howItWorksTitle}</h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[22px]">
          {t.howItWorks.map(([title, body], i) => (
            <Reveal key={title} delay={i * 100}>
              <div className="relative">
                <div className="font-display text-3xl font-extrabold text-accent mb-3">0{i + 1}</div>
                <div className="text-[17px] font-bold mb-2 leading-snug">{title}</div>
                <div className="text-sm text-text-5 leading-relaxed">{body}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing showcase — inspired by Paramount+ surfacing the plan on the landing page itself */}
      <section className="px-6 md:px-10 py-16 border-t border-white/7">
        <Reveal className="max-w-[640px] mx-auto">
          <div
            className="rounded-[28px] border border-accent-border p-8 md:p-10 text-center transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(255,61,113,.18)]"
            style={{
              background:
                "radial-gradient(120% 100% at 50% 0%, rgba(255,61,113,.16) 0%, rgba(19,19,27,0) 60%), #13131B",
            }}
          >
            <span className="inline-block text-xs font-bold tracking-[.1em] uppercase text-[#FFAFC6] bg-accent-soft border border-accent-border px-3 py-1.5 rounded-full mb-5">
              {t.onlyPlan}
            </span>
            <div className="font-display text-2xl font-bold mb-1.5">{t.planName}</div>
            <div className="text-sm text-text-5 mb-6">{t.planTag}</div>
            <div className="flex items-end justify-center gap-1.5 mb-7">
              <span className="font-display text-[44px] md:text-[56px] font-extrabold leading-none tracking-[-.02em]">
                {formatBRL(BASE_PRICE_BRL, lang)}
              </span>
              <span className="text-sm text-text-5 font-semibold mb-2">/{t.month}</span>
            </div>
            <ul className="flex flex-col gap-2.5 mb-8 text-left max-w-[360px] mx-auto">
              {t.planIncludes.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-text-3">
                  <span className="text-accent font-bold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/cadastro">
              <Button size="lg" className="w-full sm:w-auto">
                {t.ctaWatch} →
              </Button>
            </Link>
            <p className="text-[13px] text-text-7 mt-4">{t.heroNote}</p>
          </div>
        </Reveal>
      </section>

      <section className="px-6 md:px-10 pt-2.5 pb-20 border-t border-white/7">
        <Reveal>
          <h2 className="font-display text-[28px] font-bold mb-[26px]">FAQ</h2>
        </Reveal>
        <Reveal delay={80}>
          <FaqAccordion />
        </Reveal>
      </section>

      <section
        className="px-6 md:px-10 py-16 md:py-20 border-t border-white/7 text-center"
        style={{
          background: "radial-gradient(80% 140% at 50% 100%, rgba(255,61,113,.16) 0%, rgba(10,10,15,0) 60%)",
        }}
      >
        <Reveal>
          <h2 className="font-display text-[28px] md:text-[36px] font-extrabold mb-6 max-w-[560px] mx-auto text-balance">
            {t.finalCtaTitle}
          </h2>
        </Reveal>
        <div className="max-w-[560px] mx-auto">
          <EmailCapture />
          <p className="text-[13px] text-text-7 m-0">{t.heroNote}</p>
        </div>
      </section>
    </div>
  );
}
