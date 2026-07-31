import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { WatchButton, BuyNowForm } from "@/components/shared/product-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role === "SUPER_ADMIN") {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { supplier: { include: { company: true } } },
  });

  if (!product || product.status === "ARCHIVED") {
    notFound();
  }

  const watch = await prisma.productWatch.findUnique({
    where: { userId_productId: { userId: user.id, productId: product.id } },
  });

  return (
    <AppShell role={user.role}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-xl border bg-surface-container-lowest">
            <div className="relative aspect-[4/3] w-full bg-surface-container-high">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="material-symbols-outlined text-[64px] text-on-surface-variant">
                    inventory_2
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border bg-surface-container-lowest p-6">
            <h3 className="mb-4 text-headline-md">Description</h3>
            <p className="whitespace-pre-line text-body-sm text-on-secondary-container">
              {product.description}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-xl border bg-surface-container-lowest p-8 shadow-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <span className="mb-1 block text-body-sm text-on-secondary-container">
                    {product.category ?? "Uncategorized"}
                  </span>
                  <h1 className="text-headline-lg text-primary">{product.name}</h1>
                </div>
              </div>

              <div className="mb-6 flex items-baseline justify-between border-b pb-6">
                <span className="text-mono-data font-mono-data text-[32px] font-bold text-primary">
                  €{(product.priceCents / 100).toFixed(2)}
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  {product.stockQty > 0 ? `${product.stockQty} in stock` : "Out of stock"}
                </span>
              </div>

              <div className="mb-6 space-y-2 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-on-secondary-container">SKU</span>
                  <span className="text-mono-data font-mono-data">{product.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-secondary-container">Supplier</span>
                  <span className="font-semibold">{product.supplier.company.legalName}</span>
                </div>
              </div>

              <div className="space-y-3">
                {user.role === "BUYER" && product.stockQty > 0 && (
                  <BuyNowForm productId={product.id} maxQty={product.stockQty} />
                )}
                {user.role === "BUYER" && product.stockQty === 0 && (
                  <Button className="w-full" disabled>
                    Out of Stock
                  </Button>
                )}
                <WatchButton productId={product.id} initialWatching={!!watch} />
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-surface-bright p-4">
              <span className="material-symbols-outlined text-on-secondary-container">
                security
              </span>
              <p className="text-[12px] text-on-secondary-container">
                Merchandise value is captured and held in escrow the moment you buy. Freight
                is quoted separately once the supplier reviews your order.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
