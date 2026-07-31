import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [orderCount, delinquentContracts, flaggedMessages, escrowHeld] = await Promise.all([
    prisma.order.count(),
    prisma.contract.count({ where: { status: "PAYMENT_DELINQUENT" } }),
    prisma.chatMessage.count({ where: { flagged: true } }),
    prisma.escrow.aggregate({ _sum: { heldCents: true, releasedCents: true } }),
  ]);

  const held = escrowHeld._sum.heldCents ?? 0;
  const released = escrowHeld._sum.releasedCents ?? 0;

  const stats = [
    {
      label: "Total Orders (GMV proxy)",
      value: orderCount,
      icon: "receipt_long",
    },
    {
      label: "Escrow Cash Index",
      value: `€${((held - released) / 100).toFixed(2)}`,
      icon: "security",
      mono: true,
    },
    {
      label: "Delinquent Contracts",
      value: delinquentContracts,
      icon: "gavel",
      warn: delinquentContracts > 0,
    },
    {
      label: "Flagged Chat Messages",
      value: flaggedMessages,
      icon: "shield_person",
      warn: flaggedMessages > 0,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-headline-lg text-primary tracking-tight">Super-Admin Center</h2>
        <p className="mt-1 text-body-lg text-on-secondary-container">
          Real-time oversight of institutional asset flows and security.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-surface-container-lowest p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-label-caps uppercase text-on-surface-variant">
                {stat.label}
              </span>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                {stat.icon}
              </span>
            </div>
            <span
              className={`text-[28px] font-bold ${stat.mono ? "text-mono-data font-mono-data" : ""} ${
                stat.warn ? "text-destructive-red" : "text-primary"
              }`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
