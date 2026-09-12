"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/context";

export function BottomNav() {
  const { t } = useLang();
  const pathname = usePathname();

  const items = [
    { href: "/home", icon: "⌂", label: t.navHome },
    { href: "/lista", icon: "▤", label: t.navList },
    { href: "/conta", icon: "☺", label: t.account },
  ];

  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 h-[76px] flex items-start pt-[11px] bg-[rgba(12,12,18,.96)] backdrop-blur-xl border-t border-white/9 z-40">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-1 ${active ? "text-accent" : "text-text-7"}`}
          >
            <span className="text-[19px]">{item.icon}</span>
            <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
