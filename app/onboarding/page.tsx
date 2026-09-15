import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safe-query";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/onboarding");

  const dramas = await safeQuery(
    () =>
      prisma.drama.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { id: true, titlePortuguese: true, posterUrl: true, countryOrigin: true },
      }),
    []
  );

  return <OnboardingClient dramas={dramas} />;
}
