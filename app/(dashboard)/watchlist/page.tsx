import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { WatchButton } from "@/components/shared/product-actions";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user || user.role === "SUPER_ADMIN") {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  const watches = await prisma.productWatch.findMany({
    where: { userId: user.id },
    include: { product: { include: { supplier: { include: { company: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell role={user.role}>
      <div className="mb-8">
        <h2 className="text-headline-lg text-primary tracking-tight">Watchlist</h2>
        <p className="mt-1 text-body-lg text-on-secondary-container">
          Products you&apos;re keeping an eye on.
        </p>
      </div>

      <div className="space-y-3">
        {watches.map(({ product }) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-4 rounded-xl border bg-surface-container-lowest p-4 shadow-sm"
          >
            <Link href={`/products/${product.id}`} className="flex flex-1 items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-surface-container-high">
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                      inventory_2
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-body-sm font-bold text-primary">{product.name}</p>
                <p className="text-[12px] text-on-surface-variant">
                  {product.supplier.company.legalName}
                </p>
              </div>
            </Link>
            <span className="text-mono-data font-mono-data font-bold text-primary">
              €{(product.priceCents / 100).toFixed(2)}
            </span>
            <WatchButton productId={product.id} initialWatching />
          </div>
        ))}
        {watches.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            You&apos;re not watching any products yet. Browse the{" "}
            <Link href="/products" className="font-semibold text-primary underline">
              marketplace
            </Link>{" "}
            to find some.
          </p>
        )}
      </div>
    </AppShell>
  );
}
