"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";

export function LogoutButton() {
  const { t } = useLang();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="bg-transparent border border-white/16 text-text-3 font-ui text-sm font-semibold px-4 py-2.5 rounded-[9px] cursor-pointer"
    >
      {t.logout}
    </button>
  );
}
