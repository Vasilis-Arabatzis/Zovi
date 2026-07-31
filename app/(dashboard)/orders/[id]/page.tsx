import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import {
  FreightQuoteForm,
  FreightDecisionButtons,
  CompleteOrderButton,
} from "@/components/shared/order-actions";
import { RestockChoice } from "@/components/shared/product-actions";
import { ChatThread } from "@/components/shared/chat-thread";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  AWAITING_FREIGHT_QUOTE: "Awaiting freight quote",
  FREIGHT_QUOTED: "Freight quoted — action needed",
  IN_TRANSIT: "In transit",
  CANCELLED: "Cancelled (no penalty)",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: { include: { company: true } },
      supplier: { include: { company: true } },
      product: true,
      escrow: true,
    },
  });

  if (!order) {
    notFound();
  }
  if (order.buyerId !== user.id && order.supplierId !== user.id) {
    notFound();
  }

  const isBuyer = order.buyerId === user.id;
  const otherPartyLabel = isBuyer
    ? order.supplier.company.legalName
    : order.buyer.company.legalName;

  return (
    <AppShell role={user.role}>
      <div className="mb-8">
        <h2 className="text-headline-lg text-primary tracking-tight">
          Order {order.id.slice(-8).toUpperCase()}
        </h2>
        <p className="mt-1 text-body-lg text-on-secondary-container">
          {isBuyer ? `Supplier: ${otherPartyLabel}` : `Buyer: ${otherPartyLabel}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-headline-md">Order Summary</h3>
              <span className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-bold uppercase text-on-surface-variant">
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            {order.product && (
              <div className="mb-4 flex items-center gap-3 border-b pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container-high">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    inventory_2
                  </span>
                </div>
                <div>
                  <p className="text-body-sm font-bold text-primary">{order.product.name}</p>
                  <p className="text-mono-data font-mono-data text-on-surface-variant">
                    Qty {order.quantity} × €{(order.product.priceCents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 text-body-sm">
              <div className="flex justify-between">
                <span className="text-on-secondary-container">Merchandise</span>
                <span className="text-mono-data font-mono-data">
                  €{(order.merchandiseCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-secondary-container">Freight</span>
                <span className="text-mono-data font-mono-data">
                  {order.freightCents != null
                    ? `€${(order.freightCents / 100).toFixed(2)}`
                    : "—"}
                </span>
              </div>
              {order.escrow && (
                <div className="flex justify-between">
                  <span className="text-on-secondary-container">
                    {order.escrow.releasedCents > 0 ? "Escrow released" : "Escrow held"}
                  </span>
                  <span className="text-mono-data font-mono-data text-success-emerald">
                    €
                    {(
                      (order.escrow.releasedCents > 0
                        ? order.escrow.releasedCents
                        : order.escrow.heldCents) / 100
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {isBuyer && order.status === "FREIGHT_QUOTED" && (
              <div className="mt-6 border-t pt-4">
                <FreightDecisionButtons orderId={order.id} />
              </div>
            )}
            {!isBuyer && order.status === "AWAITING_FREIGHT_QUOTE" && (
              <div className="mt-6 border-t pt-4">
                <FreightQuoteForm orderId={order.id} />
              </div>
            )}
            {isBuyer && order.status === "IN_TRANSIT" && (
              <div className="mt-6 border-t pt-4">
                <CompleteOrderButton orderId={order.id} />
              </div>
            )}
          </div>

          {!isBuyer && order.status === "IN_TRANSIT" && order.product && (
            <RestockChoice productId={order.product.id} currentStock={order.product.stockQty} />
          )}
        </div>

        <div className="lg:col-span-7">
          <ChatThread
            orderId={order.id}
            currentUserId={user.id}
            currentUserLabel="You"
            otherPartyLabel={otherPartyLabel}
          />
        </div>
      </div>
    </AppShell>
  );
}
