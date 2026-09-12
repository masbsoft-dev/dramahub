import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");
  return user;
}
