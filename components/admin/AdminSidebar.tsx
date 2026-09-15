"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/dramas", label: "Doramas" },
  { href: "/admin/genres", label: "Gêneros" },
  { href: "/admin/import", label: "Importar M3U" },
  { href: "/admin/users", label: "Usuários" },
];

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-[220px] shrink-0 md:min-h-screen bg-surface border-b md:border-b-0 md:border-r border-white/8 px-5 py-6 flex md:flex-col gap-6 md:gap-8">
      <Link href="/admin">
        <Logo size="sm" />
      </Link>
      <nav className="flex md:flex-col gap-1 flex-wrap flex-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-semibold px-3 py-2 rounded-lg no-underline ${
                active ? "bg-accent-soft text-[#FFAFC6]" : "text-text-5 hover:text-text-3"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden md:flex flex-col gap-2 text-xs text-text-7">
        <span className="truncate">{adminName}</span>
        <Link href="/home" className="text-accent font-semibold no-underline">
          ← Voltar ao app
        </Link>
      </div>
    </aside>
  );
}
