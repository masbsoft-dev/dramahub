import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

/**
 * Verifica o papel sempre contra o banco (nunca via claim no JWT) — um admin
 * rebaixado perde acesso na proxima requisicao, nao so quando o cookie expira.
 */
export async function getAdminUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") return null;

  return user;
}

export async function requireAdminUser() {
  const user = await getAdminUser();
  if (!user) throw new Error("forbidden");
  return user;
}
