import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FraudAuditPage() {
  const flaggedMessages = await prisma.chatMessage.findMany({
    where: { flagged: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-headline-lg text-primary tracking-tight">
            Fraud &amp; Communication Audit
          </h2>
          <p className="mt-1 text-body-lg text-on-secondary-container">
            Messages flagged by the contact-masking engine, unmasked for review.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold text-on-error-container">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive-red" />
          {flaggedMessages.length} FLAGGED
        </span>
      </div>

      <div className="space-y-3">
        {flaggedMessages.map((message) => (
          <div
            key={message.id}
            className="rounded-xl border bg-surface-container-lowest p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-mono-data font-mono-data text-on-surface-variant">
                Order {message.orderId}
              </span>
              <span className="text-mono-data font-mono-data text-on-surface-variant">
                {message.createdAt.toLocaleString()}
              </span>
            </div>
            <p className="mb-2 text-body-sm">
              <span className="font-bold text-on-secondary-container">Masked: </span>
              {message.maskedContent}
            </p>
            <p className="text-body-sm">
              <span className="font-bold text-on-secondary-container">Unmasked: </span>
              <span className="redacted rounded px-1" title="Click to reveal">
                {message.rawContent}
              </span>
            </p>
          </div>
        ))}
        {flaggedMessages.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">No flagged messages.</p>
        )}
      </div>
    </div>
  );
}
