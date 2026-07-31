"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function archive() {
    if (!confirm("Archive this product? It will no longer be visible to buyers.")) return;
    setPending(true);
    await fetch(`/api/products/${productId}`, { method: "DELETE" });
    setPending(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" onClick={archive} disabled={pending}>
      {pending ? "Archiving…" : "Archive"}
    </Button>
  );
}

export function RestoreProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function restore() {
    setPending(true);
    await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" onClick={restore} disabled={pending} className="gap-1.5">
      <span className="material-symbols-outlined text-[16px]">restore</span>
      {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}

export function PermanentDeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (
      !confirm(
        "Permanently delete this product? This cannot be undone. It will be removed from any past orders' details, but order history and totals are preserved.",
      )
    )
      return;
    setPending(true);
    await fetch(`/api/products/${productId}?permanent=true`, { method: "DELETE" });
    setPending(false);
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 border-destructive-red text-destructive-red hover:bg-destructive-red/10"
      onClick={remove}
      disabled={pending}
    >
      <span className="material-symbols-outlined text-[16px]">delete_forever</span>
      {pending ? "Deleting…" : "Delete permanently"}
    </Button>
  );
}

export function WatchButton({
  productId,
  initialWatching,
}: {
  productId: string;
  initialWatching: boolean;
}) {
  const router = useRouter();
  const [watching, setWatching] = useState(initialWatching);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const res = await fetch(`/api/products/${productId}/watch`, { method: "POST" });
    if (res.ok) {
      const body = await res.json();
      setWatching(body.watching);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Button
      size="sm"
      variant={watching ? "default" : "outline"}
      className="gap-1.5"
      onClick={toggle}
      disabled={pending}
    >
      <span className="material-symbols-outlined text-[16px]">
        {watching ? "visibility" : "visibility_off"}
      </span>
      {watching ? "Watching" : "Watch"}
    </Button>
  );
}

export function StockEditor({
  productId,
  initialStock,
  compact = false,
  autoEdit = false,
}: {
  productId: string;
  initialStock: number;
  compact?: boolean;
  autoEdit?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(autoEdit);
  const [stock, setStock] = useState(initialStock);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setPending(true);
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockQty: stock, status: stock > 0 ? "ACTIVE" : "OUT_OF_STOCK" }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not update stock.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-mono-data font-mono-data text-on-surface-variant">
          {initialStock}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="text-on-surface-variant hover:text-primary"
          aria-label="Edit stock"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <Input
        type="number"
        min={0}
        value={stock}
        onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
        className="w-24"
      />
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={pending}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function RestockChoice({
  productId,
  currentStock,
}: {
  productId: string;
  currentStock: number;
}) {
  const [wantsToUpdate, setWantsToUpdate] = useState(false);

  return (
    <div className="rounded-lg border border-dashed p-4">
      <label className="flex items-start gap-3 text-body-sm">
        <input
          type="checkbox"
          checked={wantsToUpdate}
          onChange={(e) => setWantsToUpdate(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-bold text-primary">Update product stock for this order?</span>
          <br />
          <span className="text-[12px] text-on-surface-variant">
            Optional — adjust remaining inventory now that this order is confirmed.
          </span>
        </span>
      </label>
      {wantsToUpdate && (
        <div className="mt-3">
          <StockEditor productId={productId} initialStock={currentStock} compact autoEdit />
        </div>
      )}
    </div>
  );
}

export function BuyNowForm({ productId, maxQty }: { productId: string; maxQty: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buyNow() {
    setError(null);
    setPending(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not place order.");
      setPending(false);
      return;
    }
    router.push(`/orders/${body.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={1}
          max={maxQty}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))
          }
          className="w-24"
        />
        <Button className="flex-1 gap-2" onClick={buyNow} disabled={pending}>
          <span className="material-symbols-outlined text-[18px]">account_balance</span>
          {pending ? "Placing order…" : "Buy Now — Escrow Protected"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
