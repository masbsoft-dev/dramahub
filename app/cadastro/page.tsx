"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Logo } from "@/components/ui/Logo";
import { Stepper } from "@/components/ui/Stepper";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCpf } from "@/lib/cpf";
import { getDeviceFingerprint, getDeviceName } from "@/lib/device-fingerprint";

export default function CadastroPage() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const [deviceFingerprint, deviceName] = await Promise.all([
        getDeviceFingerprint(),
        Promise.resolve(getDeviceName()),
      ]);

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, cpf, password, deviceFingerprint, deviceName }),
      });

      if (res.ok) {
        router.push("/plano");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data.error === "email_or_cpf_in_use") {
        setErrors({ email: t.errEmailInUse });
      } else if (data.error === "validation_error") {
        setErrors({ form: t.errGeneric });
      } else {
        setErrors({ form: t.errGeneric });
      }
    } catch {
      setErrors({ form: t.errGeneric });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] min-h-screen bg-bg-2 dh-fade-in">
      <div className="px-6 md:px-14 py-10 md:py-12 flex flex-col min-w-0">
        <Link href="/" className="mb-10 md:mb-[54px] inline-block w-fit">
          <Logo />
        </Link>
        <div className="max-w-[440px]">
          <Stepper step={1} />
          <div className="text-xs tracking-[.14em] uppercase text-text-7 font-bold mb-3">
            {t.step1}
          </div>
          <h1 className="font-display text-[28px] md:text-[34px] font-bold mb-2.5 leading-[1.15]">
            {t.signupTitle}
          </h1>
          <p className="text-[15px] text-text-5 mb-[34px] leading-relaxed">{t.signupSub}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
            <Input
              label={t.fName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label={t.fEmail}
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              inputMode="numeric"
              required
            />
            <Input
              label={t.fPass}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={t.passHint}
              required
              autoComplete="new-password"
              minLength={8}
            />
            {errors.form && <p className="text-sm text-accent">{errors.form}</p>}
            <Button type="submit" size="lg" disabled={loading} className="mt-2">
              {loading ? "…" : t.continue}
            </Button>
            <p className="text-xs text-text-8 leading-relaxed m-0">{t.terms}</p>
          </form>
        </div>
      </div>

      <div
        className="hidden lg:flex border-l border-white/8 px-10 py-12 flex-col justify-center gap-[26px]"
        style={{ background: "linear-gradient(200deg, #2A0F23 0%, #0E0A14 70%)" }}
      >
        <div className="font-display text-xl leading-[1.4] font-semibold">{t.asideQuote}</div>
        <div className="flex flex-col gap-3.5">
          {t.asideBullets.map((b) => (
            <div key={b} className="flex gap-2.5 items-start">
              <span className="text-accent font-extrabold text-[15px]">✓</span>
              <span className="text-sm text-text-3 leading-relaxed">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
