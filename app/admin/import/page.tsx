import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportUploadForm } from "@/components/admin/ImportUploadForm";

export default async function AdminImportPage() {
  const imports = await prisma.playlistImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="px-6 md:px-10 py-10 max-w-[900px]">
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">Importar playlist M3U</h1>
      <p className="text-sm text-text-5 mb-8">
        Aceita upload de arquivo <code>.m3u</code>/<code>.m3u8</code> ou uma URL — use uma fonte para a
        qual você tenha direito de distribuição. Os itens ficam pendentes de revisão antes de
        virarem doramas em rascunho no catálogo.
      </p>

      <ImportUploadForm />

      <h2 className="font-display text-lg font-bold mb-4">Importações anteriores</h2>
      <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-7 border-b border-white/8">
              <th className="px-5 py-3 font-semibold">Fonte</th>
              <th className="px-5 py-3 font-semibold">Itens</th>
              <th className="px-5 py-3 font-semibold">Data</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <tr key={imp.id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3 font-semibold">{imp.sourceLabel}</td>
                <td className="px-5 py-3 text-text-5">{imp._count.items}</td>
                <td className="px-5 py-3 text-text-5">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                    imp.createdAt
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/import/${imp.id}`} className="text-accent font-semibold no-underline">
                    Revisar
                  </Link>
                </td>
              </tr>
            ))}
            {imports.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-text-5">
                  Nenhuma importação ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
