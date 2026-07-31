import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { searchProducts } from "@/lib/meilisearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface ProductCard {
  id: string;
  name: string;
  category: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  supplierName: string;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role === "SUPER_ADMIN") {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let products: ProductCard[];
  if (query) {
    try {
      const hits = await searchProducts(query);
      products = hits.map((hit) => ({
        id: hit.id,
        name: hit.name,
        category: hit.category,
        priceCents: hit.priceCents,
        currency: hit.currency,
        imageUrl: hit.imageUrl,
        supplierName: hit.supplierName,
      }));
    } catch {
      const dbResults = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { supplier: { include: { company: true } } },
        take: 48,
      });
      products = dbResults.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        priceCents: p.priceCents,
        currency: p.currency,
        imageUrl: p.imageUrl,
        supplierName: p.supplier.company.legalName,
      }));
    }
  } else {
    const dbResults = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: { supplier: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
      take: 48,
    });
    products = dbResults.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      priceCents: p.priceCents,
      currency: p.currency,
      imageUrl: p.imageUrl,
      supplierName: p.supplier.company.legalName,
    }));
  }

  return (
    <AppShell role={user.role}>
      <div className="mb-8">
        <h2 className="text-headline-lg text-primary tracking-tight">Marketplace</h2>
        <p className="mt-1 text-body-lg text-on-secondary-container">
          Search verified institutional assets across every supplier.
        </p>
      </div>

      <form method="GET" className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by name, description, or SKU…"
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-lg"
          >
            <div className="relative h-48 overflow-hidden bg-surface-container-high">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                    inventory_2
                  </span>
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="mb-1 text-body-lg font-bold text-primary">{product.name}</p>
              <p className="mb-4 text-body-sm text-on-surface-variant">
                {product.supplierName}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-mono-data font-mono-data font-bold text-primary">
                  €{(product.priceCents / 100).toFixed(2)}
                </span>
                {product.category && (
                  <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">
                    {product.category}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">
          {query ? `No products match "${query}".` : "No products listed yet."}
        </p>
      )}
    </AppShell>
  );
}
