import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/require-admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/home");

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      <AdminSidebar adminName={admin.fullName} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
