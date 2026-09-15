import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : undefined,
    include: {
      subscription: true,
      _count: { select: { registeredDevices: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1200px]">
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-8">Usuários</h1>

      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full max-w-[360px] bg-white/5 border border-white/14 rounded-[10px] px-4 py-2.5 text-sm text-white outline-none focus:border-accent"
        />
      </form>

      <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-7 border-b border-white/8">
              <th className="px-5 py-3 font-semibold">Nome</th>
              <th className="px-5 py-3 font-semibold">E-mail</th>
              <th className="px-5 py-3 font-semibold">Papel</th>
              <th className="px-5 py-3 font-semibold">Assinatura</th>
              <th className="px-5 py-3 font-semibold">Telas extras</th>
              <th className="px-5 py-3 font-semibold">Dispositivos</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3 font-semibold">{u.fullName}</td>
                <td className="px-5 py-3 text-text-5">{u.email}</td>
                <td className="px-5 py-3 text-text-5">{u.role}</td>
                <td className="px-5 py-3">
                  {u.subscription ? (
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                        u.subscription.status === "ACTIVE"
                          ? "bg-[rgba(61,220,151,.14)] text-success"
                          : "bg-white/8 text-text-5"
                      }`}
                    >
                      {u.subscription.status}
                    </span>
                  ) : (
                    <span className="text-text-7">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-text-5">{u.subscription?.extraScreensCount ?? "—"}</td>
                <td className="px-5 py-3 text-text-5">{u._count.registeredDevices}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/users/${u.id}`} className="text-accent font-semibold no-underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-text-5">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
