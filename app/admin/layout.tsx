import { redirect } from "next/navigation";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  return <AppShell role="SUPER_ADMIN">{children}</AppShell>;
}
