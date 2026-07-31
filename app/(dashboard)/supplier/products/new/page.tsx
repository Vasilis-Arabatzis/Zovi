import { redirect } from "next/navigation";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { NewProductForm } from "@/components/shared/new-product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPPLIER") {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  return (
    <AppShell role="SUPPLIER">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h2 className="text-headline-lg text-primary tracking-tight">Add New Product</h2>
          <p className="mt-1 text-body-lg text-on-secondary-container">
            List a new asset for buyers to discover in the marketplace.
          </p>
        </div>

        <NewProductForm />
      </div>
    </AppShell>
  );
}
