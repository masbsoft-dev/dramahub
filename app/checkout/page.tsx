import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { maskCpf } from "@/lib/cpf";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export default async function CheckoutPage({
  searchParams,
}: PageProps<"/checkout">) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/checkout");
  if (user.subscription?.stripeSubscriptionId) redirect("/home");

  const params = await searchParams;
  const rawExtra = Array.isArray(params.extra) ? params.extra[0] : params.extra;
  const extraScreensCount = Math.max(0, Math.min(3, Number(rawExtra ?? 0) || 0));

  return (
    <CheckoutClient
      extraScreensCount={extraScreensCount}
      fullName={user.fullName}
      email={user.email}
      cpfMasked={maskCpf(user.cpf)}
    />
  );
}
