import { prisma } from "@/lib/prisma";
import { GenresManager } from "@/components/admin/GenresManager";

export default async function AdminGenresPage() {
  const genres = await prisma.genre.findMany({
    include: { _count: { select: { dramas: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="px-6 md:px-10 py-10">
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-8">Gêneros</h1>
      <GenresManager genres={genres} />
    </div>
  );
}
