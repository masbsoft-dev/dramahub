import { cookies } from "next/headers";
import type { Lang } from "./dictionaries";
import { LANG_COOKIE } from "./constants";

export async function getLangFromCookies(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return value === "en" ? "en" : "pt";
}
