"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelSubscriptionButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Cancelar a assinatura deste usuário no Stripe?")) return;
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/cancel-subscription`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="bg-accent-soft border border-accent-border text-[#FF7FA2] font-semibold text-sm px-4 py-2.5 rounded-[10px] cursor-pointer disabled:opacity-50"
    >
      {loading ? "Cancelando…" : "Cancelar assinatura"}
    </button>
  );
}
