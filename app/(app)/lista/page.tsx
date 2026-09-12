import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safe-query";
import { getCurrentUser } from "@/lib/current-user";
import { getLangFromCookies } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { posterStyle } from "@/lib/poster";

export default async function ListaPage() {
  const [user, lang] = await Promise.all([getCurrentUser(), getLangFromCookies()]);
  if (!user) redirect("/entrar?next=/lista");
  const t = dictionaries[lang];

  const favorites = await safeQuery(
    () =>
      prisma.userFavorite.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { drama: true },
      }),
    []
  );

  return (
    <div className="px-6 md:px-9 py-11 pb-20 max-w-[1200px] mx-auto">
      <h1 className="font-display text-2xl md:text-[32px] font-bold mb-8">{t.navList}</h1>
      {favorites.length === 0 ? (
        <p className="text-text-5 text-[15px]">
          {lang === "pt" ? "Você ainda não favoritou nenhum dorama." : "You haven't favourited any drama yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {favorites.map(({ drama }) => (
            <Link
              key={drama.id}
              href={`/dramas/${drama.id}`}
              className="bg-surface rounded-xl overflow-hidden border border-white/8 no-underline text-text"
            >
              <div className="h-[180px]" style={posterStyle(drama.posterUrl)} />
              <div className="px-3 py-2.5 text-sm font-semibold truncate">{drama.titlePortuguese}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
