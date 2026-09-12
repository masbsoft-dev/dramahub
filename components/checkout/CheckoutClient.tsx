"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useLang } from "@/lib/i18n/context";
import { Logo } from "@/components/ui/Logo";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { BASE_PRICE_BRL, EXTRA_SCREEN_PRICE_BRL, formatBRL } from "@/lib/pricing";

export function CheckoutClient({
  extraScreensCount,
  fullName,
  email,
  cpfMasked,
}: {
  extraScreensCount: number;
  fullName: string;
  email: string;
  cpfMasked: string;
}) {
  const { t, lang } = useLang();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState("");

  const total = useMemo(
    () => BASE_PRICE_BRL + extraScreensCount * EXTRA_SCREEN_PRICE_BRL,
    [extraScreensCount]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extraScreensCount }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.clientSecret) {
          setError(t.errGeneric);
          return;
        }
        setClientSecret(data.clientSecret);
        setStripePromise(loadStripe(data.publishableKey));
      } catch {
        if (!cancelled) setError(t.errGeneric);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraScreensCount]);

  return (
    <div className="min-h-screen bg-bg-2 px-6 md:px-14 py-10 md:py-12 pb-16 dh-fade-in">
      <Link href="/" className="mb-11 inline-flex">
        <Logo />
      </Link>

      <div className="max-w-[980px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-7 items-start">
        <div>
          <Stepper step={3} />
          <div className="text-xs tracking-[.14em] uppercase text-text-7 font-bold mb-3">
            {t.step3}
          </div>
          <h1 className="font-display text-[28px] md:text-[32px] font-bold mb-8">
            {t.checkoutTitle}
          </h1>

          <div className="bg-surface border border-white/9 rounded-2xl p-[26px] mb-5">
            <div className="text-[15px] font-bold mb-5">{t.personalData}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex flex-col gap-[7px]">
                <span className="text-[13px] font-semibold text-text-4">{t.fName}</span>
                <div className="bg-white/5 border border-white/14 rounded-[10px] px-4 py-3.5 text-[15px] text-text-2">
                  {fullName}
                </div>
              </div>
              <div className="flex flex-col gap-[7px]">
                <span className="text-[13px] font-semibold text-text-4">CPF</span>
                <div className="bg-white/5 border border-white/14 rounded-[10px] px-4 py-3.5 text-[15px] text-text-2">
                  {cpfMasked}
                </div>
              </div>
              <div className="flex flex-col gap-[7px]">
                <span className="text-[13px] font-semibold text-text-4">{t.fEmail}</span>
                <div className="bg-white/5 border border-white/14 rounded-[10px] px-4 py-3.5 text-[15px] text-text-2 truncate">
                  {email}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/9 rounded-2xl p-[26px]">
            {error && <p className="text-sm text-accent mb-4">{error}</p>}
            {!clientSecret && !error && (
              <p className="text-sm text-text-5">{lang === "pt" ? "Carregando pagamento…" : "Loading payment…"}</p>
            )}
            {clientSecret && stripePromise && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#FF3D71",
                      colorBackground: "#13131B",
                      colorText: "#F5F3F7",
                      colorDanger: "#FF3D71",
                      borderRadius: "10px",
                    },
                  },
                }}
              >
                <StripePaymentForm />
              </Elements>
            )}
          </div>
        </div>

        <div className="bg-surface border border-white/9 rounded-2xl p-[26px] lg:sticky lg:top-[90px]">
          <div className="text-xs tracking-[.14em] uppercase text-text-7 font-bold mb-5">
            {t.summary}
          </div>
          <div className="flex justify-between text-sm mb-[11px]">
            <span className="text-text-3">{t.planName}</span>
            <span className="font-semibold">{formatBRL(BASE_PRICE_BRL, lang)}</span>
          </div>
          <div className="flex justify-between text-sm mb-[18px]">
            <span className="text-text-3">
              {extraScreensCount} × {t.extraScreens}
            </span>
            <span className="font-semibold">
              {formatBRL(extraScreensCount * EXTRA_SCREEN_PRICE_BRL, lang)}
            </span>
          </div>
          <div className="h-px bg-white/10 mb-[18px]" />
          <div className="flex justify-between items-end">
            <span className="text-[13px] text-text-5">{t.recurring}</span>
            <span className="font-display text-2xl font-extrabold text-accent">
              {formatBRL(total, lang)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StripePaymentForm() {
  const { t } = useLang();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError("");

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding`,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? t.errGeneric);
      setSubmitting(false);
    } else {
      router.push("/onboarding");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PaymentElement />
      {error && <p className="text-sm text-accent">{error}</p>}
      <Button type="submit" size="lg" disabled={!stripe || submitting} className="w-full">
        {submitting ? "…" : t.confirm}
      </Button>
    </form>
  );
}
