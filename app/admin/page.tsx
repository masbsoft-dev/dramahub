import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BASE_PRICE_BRL, EXTRA_SCREEN_PRICE_BRL, formatBRL } from "@/lib/pricing";

function StatCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="bg-surface border border-white/8 rounded-2xl p-6">
      <div className="text-xs tracking-[.1em] uppercase text-text-7 font-bold mb-2">{label}</div>
      <div className="font-display text-2xl md:text-3xl font-extrabold">{value}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="no-underline text-text">
      {content}
    </Link>
  ) : (
    content
  );
}

export default async function AdminDashboardPage() {
  const [
    activeSubs,
    activeSubsAgg,
    userCount,
    publishedCount,
    draftCount,
    pendingImportItems,
    topFavorites,
  ] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.aggregate({ where: { status: "ACTIVE" }, _sum: { extraScreensCount: true } }),
    prisma.user.count(),
    prisma.drama.count({ where: { status: "PUBLISHED" } }),
    prisma.drama.count({ where: { status: "DRAFT" } }),
    prisma.playlistImportItem.count({ where: { status: "PENDING" } }),
    prisma.userFavorite.groupBy({
      by: ["dramaId"],
      _count: { dramaId: true },
      orderBy: { _count: { dramaId: "desc" } },
      take: 5,
    }),
  ]);

  const mrr = activeSubs * BASE_PRICE_BRL + (activeSubsAgg._sum.extraScreensCount ?? 0) * EXTRA_SCREEN_PRICE_BRL;

  const topDramas = await prisma.drama.findMany({
    where: { id: { in: topFavorites.map((f) => f.dramaId) } },
    select: { id: true, titlePortuguese: true },
  });
  const topDramasWithCount = topFavorites.map((f) => ({
    title: topDramas.find((d) => d.id === f.dramaId)?.titlePortuguese ?? "—",
    count: f._count.dramaId,
  }));

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1200px]">
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Assinantes ativos" value={String(activeSubs)} href="/admin/users" />
        <StatCard label="MRR estimado" value={formatBRL(mrr)} />
        <StatCard label="Usuários" value={String(userCount)} href="/admin/users" />
        <StatCard
          label="Itens de import pendentes"
          value={String(pendingImportItems)}
          href="/admin/import"
        />
        <StatCard label="Doramas publicados" value={String(publishedCount)} href="/admin/dramas" />
        <StatCard label="Doramas em rascunho" value={String(draftCount)} href="/admin/dramas" />
      </div>

      <div className="bg-surface border border-white/8 rounded-2xl p-6 max-w-[480px]">
        <div className="text-xs tracking-[.1em] uppercase text-text-7 font-bold mb-4">
          Mais favoritados
        </div>
        {topDramasWithCount.length === 0 ? (
          <p className="text-sm text-text-5">Sem favoritos ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {topDramasWithCount.map((d, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-text-3">{d.title}</span>
                <span className="font-semibold text-text-5">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
