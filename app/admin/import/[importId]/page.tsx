import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ImportReviewTable } from "@/components/admin/ImportReviewTable";

const PAGE_SIZE = 50;
const KINDS = ["ALL", "MOVIE", "SERIES", "CHANNEL", "UNKNOWN"] as const;

export default async function ImportReviewPage({
  params,
  searchParams,
}: PageProps<"/admin/import/[importId]">) {
  const { importId } = await params;
  const sp = await searchParams;
  const kind = typeof sp.kind === "string" ? sp.kind : "ALL";
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const playlistImport = await prisma.playlistImport.findUnique({ where: { id: importId } });
  if (!playlistImport) notFound();

  const where = {
    importId,
    status: "PENDING" as const,
    ...(kind !== "ALL" ? { kind: kind as "MOVIE" | "SERIES" | "CHANNEL" | "UNKNOWN" } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [items, total, kindCounts] = await Promise.all([
    prisma.playlistImportItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.playlistImportItem.count({ where }),
    prisma.playlistImportItem.groupBy({
      by: ["kind"],
      where: { importId, status: "PENDING" },
      _count: { kind: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countFor = (k: string) =>
    k === "ALL" ? kindCounts.reduce((s, c) => s + c._count.kind, 0) : kindCounts.find((c) => c.kind === k)?._count.kind ?? 0;

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({ kind, q, page: String(page), ...overrides });
    if (!p.get("q")) p.delete("q");
    return `?${p.toString()}`;
  }

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1100px]">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="font-display text-2xl md:text-3xl font-bold">{playlistImport.sourceLabel}</h1>
        <Link href="/admin/import" className="text-accent font-semibold text-sm no-underline">
          ← Todas as importações
        </Link>
      </div>
      <p className="text-sm text-text-5 mb-6">
        {total} pendente(s) de {playlistImport.itemCount} no total.
      </p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {KINDS.map((k) => (
          <Link
            key={k}
            href={buildHref({ kind: k, page: "1" })}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full no-underline ${
              kind === k ? "bg-accent text-white" : "bg-white/5 text-text-4"
            }`}
          >
            {k === "ALL" ? "Todos" : k} ({countFor(k)})
          </Link>
        ))}
      </div>

      <form className="mb-6">
        <input type="hidden" name="kind" value={kind} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome..."
          className="w-full max-w-[360px] bg-white/5 border border-white/14 rounded-[10px] px-4 py-2.5 text-sm text-white outline-none focus:border-accent"
        />
      </form>

      <ImportReviewTable importId={importId} items={items} />

      {totalPages > 1 && (
        <div className="flex gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <Link
              key={i}
              href={buildHref({ page: String(i + 1) })}
              className={`text-xs font-semibold w-8 h-8 flex items-center justify-center rounded-lg no-underline ${
                page === i + 1 ? "bg-accent text-white" : "bg-white/5 text-text-4"
              }`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
