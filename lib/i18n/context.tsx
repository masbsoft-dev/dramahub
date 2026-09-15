"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, type Dictionary, type Lang } from "./dictionaries";
import { LANG_COOKIE } from "./constants";

type LangContextValue = {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Server Components read the lang cookie at request time, so a plain
      // client state update doesn't touch their already-rendered markup —
      // refresh() re-fetches them with the new cookie in one round-trip.
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LangContextValue>(
    () => ({ lang, t: dictionaries[lang], setLang }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
