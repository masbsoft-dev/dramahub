import { prisma } from "@/lib/prisma";
import { DramaForm } from "@/components/admin/DramaForm";

export default async function NewDramaPage() {
  const allGenres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="px-6 md:px-10 py-10">
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-8">Novo dorama</h1>
      <DramaForm initial={null} allGenres={allGenres} />
    </div>
  );
}
