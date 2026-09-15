/**
 * Promove um usuario existente a ADMIN. Bootstrap necessario ja que nao ha
 * nenhum admin por padrao.
 *
 * Uso: npm run admin:promote -- email@exemplo.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: npm run admin:promote -- email@exemplo.com");
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { role: "ADMIN" },
  });

  console.log(`✓ ${user.email} agora e ADMIN.`);
}

main()
  .catch((err) => {
    console.error(err.code === "P2025" ? "Usuario nao encontrado." : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
