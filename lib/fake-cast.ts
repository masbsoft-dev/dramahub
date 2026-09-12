/**
 * Elenco e trilha sonora sao apresentacionais apenas (a especificacao nao
 * modela Cast/Soundtrack no Prisma schema) — gerados deterministicamente a
 * partir do id do dorama para nao depender de um scraper real.
 */
import { posterStyle } from "./poster";

const ACTOR_NAMES = [
  "Seo Ha-eun",
  "Kim Do-yun",
  "Park Min-ji",
  "Lee Jun-ho",
  "Han So-ra",
  "Jung Tae-woo",
];

const ROLE_NAMES_PT = ["Protagonista", "Interesse amoroso", "Melhor amiga", "Antagonista", "Mentora", "Detetive"];
const ROLE_NAMES_EN = ["Lead", "Love interest", "Best friend", "Antagonist", "Mentor", "Detective"];

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function fakeCast(dramaId: string, gradient: string, lang: "pt" | "en") {
  const roles = lang === "pt" ? ROLE_NAMES_PT : ROLE_NAMES_EN;
  const seed = hashSeed(dramaId);
  return ACTOR_NAMES.map((actor, i) => ({
    actor,
    role: roles[i],
    style: posterStyle(gradient),
    key: `${dramaId}-${i}-${(seed + i) % 100}`,
  }));
}

const SONG_NAMES = ["Through the Night", "Winter Letter", "Paper Moon", "Lanterns", "Us"];

export function fakeOst(dramaId: string, dramaTitle: string) {
  const seed = hashSeed(dramaId);
  return SONG_NAMES.map((song, i) => ({
    song,
    artist: `Artist ${((seed + i) % 12) + 1}`,
    dur: `${3 + ((seed + i) % 2)}:${String(10 + ((seed + i * 7) % 49)).padStart(2, "0")}`,
    key: `${dramaId}-ost-${i}`,
  })).map((o) => ({ ...o, from: dramaTitle }));
}
