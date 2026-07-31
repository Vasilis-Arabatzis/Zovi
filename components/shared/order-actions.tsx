"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FreightQuoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    const freightCents = amount.trim() === "" ? 0 : Math.round(Number(amount) * 100);
    if (!Number.isFinite(freightCents) || freightCents < 0) return;

    setPending(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "quote", freightCents }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.01"
        placeholder="Freight € (blank = free)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28"
      />
      <Button size="sm" onClick={submit} disabled={pending}>
        {pending ? "Sending..." : "Submit quote"}
      </Button>
    </div>
  );
}

export function FreightDecisionButtons({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function decide(action: "approve" | "reject") {
    setPending(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => decide("approve")} disabled={pending}>
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-destructive-red text-destructive-red hover:bg-destructive-red/10"
        onClick={() => decide("reject")}
        disabled={pending}
      >
        Reject
      </Button>
    </div>
  );
}

export function CompleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function complete() {
    if (!confirm("Mark this order as delivered? This releases funds to the supplier.")) return;
    setPending(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <Button size="sm" onClick={complete} disabled={pending} className="gap-1.5">
      <span className="material-symbols-outlined text-[16px]">task_alt</span>
      {pending ? "Confirming…" : "Mark as Delivered"}
    </Button>
  );
}

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm("Delete this cancelled order permanently? This cannot be undone.")) return;
    setPending(true);
    const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 border-destructive-red text-destructive-red hover:bg-destructive-red/10"
      onClick={remove}
      disabled={pending}
    >
      <span className="material-symbols-outlined text-[16px]">delete</span>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
