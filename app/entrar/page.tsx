"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Logo } from "@/components/ui/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getDeviceFingerprint, getDeviceName } from "@/lib/device-fingerprint";

export default function EntrarPage() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const [deviceFingerprint, deviceName] = await Promise.all([
        getDeviceFingerprint(),
        Promise.resolve(getDeviceName()),
      ]);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceFingerprint, deviceName }),
      });

      if (res.ok) {
        router.push(searchParams.get("next") ?? "/home");
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error === "device_limit_reached" ? t.errDeviceLimit : t.errLogin);
    } catch {
      setError(t.errGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-2 dh-fade-in flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-10">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-[400px] bg-surface border border-white/9 rounded-2xl p-8">
        <h1 className="font-display text-2xl font-bold mb-6">{t.login}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          <Input
            label={t.fEmail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label={t.fPass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-accent">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading ? "…" : t.login}
          </Button>
        </form>
        <p className="text-sm text-text-6 mt-6 text-center">
          <Link href="/cadastro" className="text-accent font-semibold">
            {t.signupTitle}
          </Link>
        </p>
      </div>
    </div>
  );
}
