import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import {
  ArchiveProductButton,
  RestoreProductButton,
  PermanentDeleteProductButton,
  StockEditor,
} from "@/components/shared/product-actions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-success-emerald/10 text-success-emerald",
  OUT_OF_STOCK: "bg-warning-amber/10 text-warning-amber",
  ARCHIVED: "bg-surface-container-highest text-on-surface-variant",
};

export default async function SupplierProductsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPPLIER") {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  const products = await prisma.product.findMany({
    where: { supplierId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell role="SUPPLIER">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-lg text-primary tracking-tight">Product Catalog</h2>
          <p className="mt-1 text-body-lg text-on-secondary-container">
            Manage the products buyers can discover on the marketplace.
          </p>
        </div>
        <Button render={<Link href="/supplier/products/new" />} nativeButton={false} className="gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add New Product
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-surface-container-low">
                <th className="px-6 py-4 text-label-caps uppercase text-on-surface-variant">
                  Product
                </th>
                <th className="px-6 py-4 text-label-caps uppercase text-on-surface-variant">
                  SKU
                </th>
                <th className="px-6 py-4 text-right text-label-caps uppercase text-on-surface-variant">
                  Price
                </th>
                <th className="px-6 py-4 text-right text-label-caps uppercase text-on-surface-variant">
                  Stock
                </th>
                <th className="px-6 py-4 text-center text-label-caps uppercase text-on-surface-variant">
                  Status
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-surface-container-low">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border bg-surface-container-high">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[20px] text-primary">
                            inventory_2
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-body-sm font-bold text-primary">{product.name}</p>
                        <p className="text-[12px] text-on-surface-variant">
                          {product.category ?? "Uncategorized"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-mono-data font-mono-data text-on-surface-variant">
                      {product.sku}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-mono-data font-mono-data font-bold text-primary">
                      €{(product.priceCents / 100).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {product.status !== "ARCHIVED" ? (
                      <StockEditor productId={product.id} initialStock={product.stockQty} />
                    ) : (
                      <span className="text-mono-data font-mono-data text-on-surface-variant">
                        {product.stockQty}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_STYLE[product.status]}`}
                    >
                      {product.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {product.status !== "ARCHIVED" ? (
                      <ArchiveProductButton productId={product.id} />
                    ) : (
                      <div className="flex justify-end gap-2">
                        <RestoreProductButton productId={product.id} />
                        <PermanentDeleteProductButton productId={product.id} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <p className="p-6 text-body-sm text-on-surface-variant">
              No products yet. Add your first product to appear in the marketplace.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
