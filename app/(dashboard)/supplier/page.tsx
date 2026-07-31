import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, needsTwoFactorSetup } from "@/lib/session";
import { AppShell } from "@/components/shared/app-shell";
import { FreightQuoteForm, DeleteOrderButton } from "@/components/shared/order-actions";
import { OrderTabs } from "@/components/shared/order-tabs";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  AWAITING_FREIGHT_QUOTE: "Awaiting your freight quote",
  FREIGHT_QUOTED: "Quoted — waiting on buyer",
  IN_TRANSIT: "In transit",
  CANCELLED: "Cancelled (no penalty)",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
};

const STATUS_STYLE: Record<string, string> = {
  AWAITING_FREIGHT_QUOTE: "bg-warning-amber/10 text-warning-amber",
  FREIGHT_QUOTED: "bg-secondary-container text-on-secondary-container",
  IN_TRANSIT: "bg-tertiary-container/10 text-on-tertiary-container",
  CANCELLED: "bg-surface-container-highest text-on-surface-variant",
  COMPLETED: "bg-success-emerald/10 text-success-emerald",
  DISPUTED: "bg-error-container text-on-error-container",
};

export default async function SupplierDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPPLIER") {
    redirect("/login");
  }
  if (needsTwoFactorSetup(user)) {
    redirect("/settings");
  }

  const orders = await prisma.order.findMany({
    where: { supplierId: user.id },
    include: { buyer: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });

  const contracts = await prisma.contract.findMany({
    where: { supplierId: user.id },
  });

  const delinquent = contracts.filter((c) => c.status === "PAYMENT_DELINQUENT");

  const orderItems = orders.map((order) => ({
    id: order.id,
    status: order.status,
    node: (
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container-high">
            <span className="material-symbols-outlined text-[20px] text-primary">
              local_shipping
            </span>
          </div>
          <div>
            <p className="text-body-sm font-bold text-primary">
              {order.buyer.company.legalName}
            </p>
            <p className="text-mono-data font-mono-data text-on-surface-variant">
              €{(order.merchandiseCents / 100).toFixed(2)}
              {order.freightCents != null &&
                ` + €${(order.freightCents / 100).toFixed(2)} freight`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_STYLE[order.status] ?? "bg-surface-container-high text-on-surface-variant"}`}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          {order.status === "AWAITING_FREIGHT_QUOTE" && (
            <FreightQuoteForm orderId={order.id} />
          )}
          {order.status === "CANCELLED" && <DeleteOrderButton orderId={order.id} />}
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/orders/${order.id}`} />}
            nativeButton={false}
            className="gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            View
          </Button>
        </div>
      </div>
    ),
  }));

  return (
    <AppShell role="SUPPLIER">
      <div className="mb-8">
        <h2 className="text-headline-lg text-primary tracking-tight">Supplier Dashboard</h2>
        <p className="mt-1 text-body-lg text-on-secondary-container">
          {user.company.legalName}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-surface-container-lowest p-5 shadow-sm">
          <p className="mb-3 text-label-caps uppercase text-on-surface-variant">
            Total Orders
          </p>
          <span className="text-[28px] font-bold text-primary">{orders.length}</span>
        </div>
        <div className="rounded-xl border bg-surface-container-lowest p-5 shadow-sm">
          <p className="mb-3 text-label-caps uppercase text-on-surface-variant">
            Delinquent Contracts
          </p>
          <span className="text-[28px] font-bold text-destructive-red">
            {delinquent.length}
          </span>
        </div>
      </div>

      {delinquent.length > 0 && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-destructive-red/30 bg-error-container/30 p-5">
          <span className="material-symbols-outlined text-destructive-red">warning</span>
          <div>
            <h3 className="text-body-sm font-bold text-on-error-container">
              HALT MANUFACTURE AND FREIGHT DISPATCH IMMEDIATELY
            </h3>
            <p className="mt-1 text-body-sm text-on-secondary-container">
              Monthly renewal billing collection has failed for {delinquent.length}{" "}
              contract(s).
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-surface-container-lowest shadow-sm">
        <div className="border-b p-4">
          <h3 className="text-headline-md">Your Orders</h3>
        </div>
        <OrderTabs items={orderItems} />
      </div>
    </AppShell>
  );
}
