import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getLangFromCookies } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { DevicesList } from "@/components/dispositivos/DevicesList";

export default async function DispositivosPage() {
  const [user, lang] = await Promise.all([getCurrentUser(), getLangFromCookies()]);
  if (!user) redirect("/entrar?next=/dispositivos");
  const t = dictionaries[lang];

  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <div className="px-6 md:px-9 py-11 pb-20 max-w-[820px] mx-auto">
      <h1 className="font-display text-2xl md:text-[32px] font-bold mb-2">{t.devices}</h1>
      <p className="text-[15px] text-text-5 mb-8">{t.devicesSub}</p>
      <DevicesList
        devices={devices.map((d) => ({
          id: d.id,
          fingerprint: d.fingerprint,
          deviceName: d.deviceName,
          lastIp: d.lastIp,
          lastSeenAt: d.lastSeenAt.toISOString(),
        }))}
      />
    </div>
  );
}
