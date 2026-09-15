import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AppHeader } from "@/components/app/AppHeader";
import { BottomNav } from "@/components/app/BottomNav";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-bg relative pb-[80px] md:pb-0">
      <AppHeader userInitial={initial} isAdmin={user.role === "ADMIN"} />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
