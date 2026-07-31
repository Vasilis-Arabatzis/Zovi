"use client";

import { useState } from "react";

const ACTIVE_STATUSES = new Set([
  "AWAITING_FREIGHT_QUOTE",
  "FREIGHT_QUOTED",
  "IN_TRANSIT",
  "DISPUTED",
]);

interface OrderTabItem {
  id: string;
  status: string;
  node: React.ReactNode;
}

export function OrderTabs({ items }: { items: OrderTabItem[] }) {
  const [tab, setTab] = useState<"active" | "archive">("active");

  const active = items.filter((item) => ACTIVE_STATUSES.has(item.status));
  const archive = items.filter((item) => !ACTIVE_STATUSES.has(item.status));
  const shown = tab === "active" ? active : archive;

  return (
    <div>
      <div className="flex border-b bg-surface-container-low">
        <button
          onClick={() => setTab("active")}
          className={`px-6 py-3 text-body-sm font-bold transition-colors ${
            tab === "active"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Active ({active.length})
        </button>
        <button
          onClick={() => setTab("archive")}
          className={`px-6 py-3 text-body-sm font-bold transition-colors ${
            tab === "archive"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          Completed &amp; Cancelled ({archive.length})
        </button>
      </div>

      <div className="divide-y">
        {shown.map((item) => (
          <div key={item.id}>{item.node}</div>
        ))}
        {shown.length === 0 && (
          <p className="p-6 text-body-sm text-on-surface-variant">
            {tab === "active" ? "No active orders." : "No completed or cancelled orders."}
          </p>
        )}
      </div>
    </div>
  );
}
