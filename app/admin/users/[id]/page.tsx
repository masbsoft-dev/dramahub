import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { maskCpf } from "@/lib/cpf";
import { deviceIcon } from "@/lib/device-icon";
import { CancelSubscriptionButton } from "@/components/admin/CancelSubscriptionButton";

export default async function AdminUserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      registeredDevices: { orderBy: { lastSeenAt: "desc" } },
      _count: { select: { favoriteDramas: true, watchProgresses: true } },
    },
  });

  if (!user) notFound();

  return (
    <div className="px-6 md:px-10 py-10 max-w-[800px]">
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-8">{user.fullName}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="bg-surface border border-white/8 rounded-2xl p-6">
          <div className="text-xs tracking-[.1em] uppercase text-text-7 font-bold mb-4">Conta</div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-5">E-mail</span>
              <span className="font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-5">CPF</span>
              <span className="font-semibold">{maskCpf(user.cpf)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-5">Papel</span>
              <span className="font-semibold">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-5">Favoritos</span>
              <span className="font-semibold">{user._count.favoriteDramas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-5">Episódios assistidos</span>
              <span className="font-semibold">{user._count.watchProgresses}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-white/8 rounded-2xl p-6">
          <div className="text-xs tracking-[.1em] uppercase text-text-7 font-bold mb-4">Assinatura</div>
          {user.subscription ? (
            <>
              <div className="flex flex-col gap-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-text-5">Status</span>
                  <span className="font-semibold">{user.subscription.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-5">Telas extras</span>
                  <span className="font-semibold">{user.subscription.extraScreensCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-5">Renova em</span>
                  <span className="font-semibold">
                    {new Intl.DateTimeFormat("pt-BR").format(user.subscription.currentPeriodEnd)}
                  </span>
                </div>
              </div>
              {user.subscription.status === "ACTIVE" && (
                <CancelSubscriptionButton userId={user.id} />
              )}
            </>
          ) : (
            <p className="text-sm text-text-5">Sem assinatura.</p>
          )}
        </div>
      </div>

      <div className="bg-surface border border-white/8 rounded-2xl p-6">
        <div className="text-xs tracking-[.1em] uppercase text-text-7 font-bold mb-4">Dispositivos</div>
        {user.registeredDevices.length === 0 ? (
          <p className="text-sm text-text-5">Nenhum dispositivo registrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {user.registeredDevices.map((d) => (
              <div key={d.id} className="flex items-center gap-3 text-sm">
                <span>{deviceIcon(d.deviceName)}</span>
                <span className="font-semibold">{d.deviceName}</span>
                <span className="text-text-6">{d.lastIp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
