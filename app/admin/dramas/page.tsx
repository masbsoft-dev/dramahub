import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDramasPage({
  searchParams,
}: PageProps<"/admin/dramas">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  const dramas = await prisma.drama.findMany({
    where: q
      ? {
          OR: [
            { titlePortuguese: { contains: q, mode: "insensitive" } },
            { titleOriginal: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { episodes: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1200px]">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Doramas</h1>
        <Link
          href="/admin/dramas/new"
          className="bg-accent text-white font-semibold text-sm px-4 py-2.5 rounded-[10px] no-underline"
        >
          + Novo dorama
        </Link>
      </div>

      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título..."
          className="w-full max-w-[360px] bg-white/5 border border-white/14 rounded-[10px] px-4 py-2.5 text-sm text-white outline-none focus:border-accent"
        />
      </form>

      <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-7 border-b border-white/8">
              <th className="px-5 py-3 font-semibold">Título</th>
              <th className="px-5 py-3 font-semibold">País</th>
              <th className="px-5 py-3 font-semibold">Ano</th>
              <th className="px-5 py-3 font-semibold">Episódios</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {dramas.map((drama) => (
              <tr key={drama.id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3 font-semibold">{drama.titlePortuguese}</td>
                <td className="px-5 py-3 text-text-5">{drama.countryOrigin}</td>
                <td className="px-5 py-3 text-text-5">{drama.releaseYear}</td>
                <td className="px-5 py-3 text-text-5">{drama._count.episodes}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                      drama.status === "PUBLISHED"
                        ? "bg-[rgba(61,220,151,.14)] text-success"
                        : "bg-white/8 text-text-5"
                    }`}
                  >
                    {drama.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/dramas/${drama.id}`} className="text-accent font-semibold no-underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {dramas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-text-5">
                  Nenhum dorama encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
