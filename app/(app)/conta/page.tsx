import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getLangFromCookies } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { maskCpf } from "@/lib/cpf";
import { ManageScreensWidget } from "@/components/conta/ManageScreensWidget";
import { LogoutButton } from "@/components/conta/LogoutButton";

export default async function ContaPage() {
  const [user, lang] = await Promise.all([getCurrentUser(), getLangFromCookies()]);
  if (!user) redirect("/entrar?next=/conta");
  const t = dictionaries[lang];

  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";
  const sub = user.subscription;

  return (
    <div className="px-6 md:px-9 py-11 pb-20 max-w-[1000px] mx-auto">
      <h1 className="font-display text-2xl md:text-[32px] font-bold mb-8">{t.account}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
        <div className="bg-surface border border-white/9 rounded-2xl p-[26px]">
          <div className="text-xs tracking-[.14em] uppercase text-text-7 font-bold mb-[22px]">
            {t.subscriber}
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-display text-xl font-bold"
              style={{ background: "linear-gradient(135deg,#FF3D71,#7B2C4C)" }}
            >
              {initial}
            </div>
            <div>
              <div className="text-lg font-bold">{user.fullName}</div>
              <div className="text-sm text-text-5">{user.email}</div>
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex justify-between text-sm">
              <span className="text-text-5">CPF</span>
              <span className="font-semibold">{maskCpf(user.cpf)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-5">{t.password}</span>
              <span className="font-semibold text-text-6">••••••••</span>
            </div>
          </div>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>

        <div className="bg-surface border border-white/9 rounded-2xl p-[26px]">
          <div className="flex justify-between items-center mb-[22px]">
            <span className="text-xs tracking-[.14em] uppercase text-text-7 font-bold">
              {t.currentPlan}
            </span>
            {sub && sub.status === "ACTIVE" && (
              <span className="text-[11px] font-extrabold tracking-[.08em] uppercase bg-[rgba(61,220,151,.14)] text-success border border-[rgba(61,220,151,.3)] px-2.5 py-1 rounded-full">
                {t.active}
              </span>
            )}
          </div>

          {sub ? (
            <>
              <div className="font-display text-xl font-bold mb-1.5">{t.planName}</div>
              <div className="text-sm text-text-5 mb-[22px]">
                {t.renews}{" "}
                {new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(sub.currentPeriodEnd)}
              </div>
              <ManageScreensWidget initialExtraScreens={sub.extraScreensCount} />
            </>
          ) : (
            <>
              <p className="text-sm text-text-5 mb-4">
                {lang === "pt" ? "Você ainda não tem uma assinatura ativa." : "You don't have an active subscription yet."}
              </p>
              <a
                href="/plano"
                className="inline-block bg-accent text-white font-semibold text-sm px-5 py-3 rounded-[10px] no-underline"
              >
                {t.goPay}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
