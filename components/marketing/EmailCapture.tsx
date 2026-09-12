"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/Button";

export function EmailCapture() {
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    router.push(`/cadastro${params}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2.5 flex-wrap items-center mb-3.5">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPh}
        className="flex-1 min-w-[260px] bg-white/6 border border-white/16 rounded-[10px] px-[18px] py-4 text-white font-ui text-[15px] outline-none focus:border-accent"
      />
      <Button type="submit" size="lg">
        {t.ctaWatch} →
      </Button>
    </form>
  );
}
