"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { deviceIcon } from "@/lib/device-icon";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

type DeviceItem = {
  id: string;
  fingerprint: string;
  deviceName: string;
  lastIp: string;
  lastSeenAt: string;
};

export function DevicesList({ devices: initialDevices }: { devices: DeviceItem[] }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [devices, setDevices] = useState(initialDevices);
  const [currentFingerprint, setCurrentFingerprint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getDeviceFingerprint().then(setCurrentFingerprint);
  }, []);

  function disconnect(deviceId: string) {
    startTransition(async () => {
      const res = await fetch("/api/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      if (res.ok) setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    });
  }

  function logoutAll() {
    startTransition(async () => {
      const res = await fetch("/api/devices/logout-all", { method: "POST" });
      if (res.ok) router.push("/");
    });
  }

  const dateFormatter = new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="flex flex-col gap-2.5 mb-7">
        {devices.map((d) => {
          const isCurrent = d.fingerprint === currentFingerprint;
          return (
            <div
              key={d.id}
              className="flex items-center gap-4 bg-surface border border-white/8 rounded-xl px-5 py-[18px]"
            >
              <div className="w-[42px] h-[42px] rounded-[10px] bg-white/6 flex items-center justify-center text-[17px] shrink-0">
                {deviceIcon(d.deviceName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold flex items-center gap-2.5 flex-wrap">
                  {d.deviceName}
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold tracking-[.06em] uppercase bg-accent-soft text-[#FFAFC6] border border-accent-border px-2 py-0.5 rounded-full">
                      {lang === "pt" ? "Este aparelho" : "This device"}
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-text-5 mt-0.5">
                  {d.lastIp} · {dateFormatter.format(new Date(d.lastSeenAt))}
                </div>
              </div>
              {!isCurrent && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => disconnect(d.id)}
                  className="bg-transparent border border-white/18 text-text-3 font-ui text-[13px] font-semibold px-3.5 py-2 rounded-lg cursor-pointer"
                >
                  {t.disconnect}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={logoutAll}
        className="bg-accent-soft border border-accent-border text-[#FF7FA2] font-ui font-bold text-[15px] px-6 py-3.5 rounded-[10px] cursor-pointer"
      >
        {t.logoutAll}
      </button>
    </>
  );
}
