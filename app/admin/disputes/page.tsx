import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  const disputedOrders = await prisma.order.findMany({
    where: { status: "DISPUTED" },
    include: { buyer: { include: { company: true } }, supplier: { include: { company: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-headline-lg text-primary tracking-tight">
          Escrow Dispute Resolution
        </h2>
        <p className="mt-1 text-body-lg text-on-secondary-container">
          Claims filed by buyers regarding split shipments.
        </p>
      </div>

      <div className="space-y-3">
        {disputedOrders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between rounded-xl border bg-surface-container-lowest p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-container">
                <span className="material-symbols-outlined text-on-error-container">
                  gavel
                </span>
              </div>
              <div>
                <p className="text-body-sm font-bold text-primary">
                  {order.buyer.company.legalName} vs {order.supplier.company.legalName}
                </p>
                <p className="text-mono-data font-mono-data text-on-surface-variant">
                  Order {order.id}
                </p>
              </div>
            </div>
            <span className="text-mono-data font-mono-data font-bold text-primary">
              €{(order.merchandiseCents / 100).toFixed(2)}
              {order.freightCents != null &&
                ` + €${(order.freightCents / 100).toFixed(2)}`}
            </span>
          </div>
        ))}
        {disputedOrders.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">No open disputes.</p>
        )}
      </div>
    </div>
  );
}
