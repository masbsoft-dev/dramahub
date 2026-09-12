"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useLang } from "@/lib/i18n/context";

export function AppHeader({ userInitial }: { userInitial: string }) {
  const { t } = useLang();
  const pathname = usePathname();

  const navLinks = [
    { href: "/home", label: t.navHome, primary: true },
    { href: "/home?country=KR", label: t.navK },
    { href: "/home?country=CN", label: t.navC },
    { href: "/home", label: t.navFilms },
    { href: "/lista", label: t.navList },
  ];

  return (
    <div className="sticky top-0 z-40 flex items-center gap-7 px-9 py-4 bg-[rgba(10,10,15,.9)] backdrop-blur-xl border-b border-white/7">
      <Link href="/home" className="shrink-0">
        <Logo size="sm" />
      </Link>

      <div className="hidden md:flex gap-[22px] items-center shrink-0">
        {navLinks.map((link, i) => (
          <Link
            key={link.label + i}
            href={link.href}
            className={`text-sm font-semibold whitespace-nowrap ${
              i === 0 && pathname === "/home" ? "text-text" : "text-text-6 hover:text-text-3"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex-1 min-w-3" />

      <div className="hidden sm:flex items-center gap-2 bg-white/6 border border-white/10 rounded-[9px] px-3.5 py-2.5 flex-none w-[230px] min-w-[44px] overflow-hidden">
        <span className="text-text-7 text-sm shrink-0">⌕</span>
        <span className="text-[13px] text-text-7 whitespace-nowrap overflow-hidden text-ellipsis">
          {t.search}
        </span>
      </div>

      <Link
        href="/dispositivos"
        title={t.devices}
        className="w-9 h-9 rounded-[9px] bg-white/6 border border-white/10 text-text-3 text-[15px] flex items-center justify-center"
      >
        🖥
      </Link>

      <Link
        href="/conta"
        className="w-9 h-9 rounded-full border-2 border-accent flex items-center justify-center text-white font-display text-[13px] font-bold shrink-0"
        style={{ background: "linear-gradient(135deg,#FF3D71,#7B2C4C)" }}
      >
        {userInitial}
      </Link>
    </div>
  );
}
