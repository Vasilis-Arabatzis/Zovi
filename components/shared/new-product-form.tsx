"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function NewProductForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const euros = Number(formData.get("priceCents"));
    formData.set("priceCents", String(Math.round(euros * 100)));

    const res = await fetch("/api/products", { method: "POST", body: formData });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.message ?? body.error ?? "Failed to create product.");
      setSubmitting(false);
      return;
    }

    router.push("/supplier/products");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border bg-surface-container-lowest p-8 shadow-sm"
    >
      <div className="space-y-1.5">
        <Label className="text-label-caps uppercase text-on-surface-variant">
          Product image
        </Label>
        <label
          htmlFor="image"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-32 w-32 rounded object-cover" />
          ) : (
            <>
              <span className="material-symbols-outlined text-on-surface-variant">
                cloud_upload
              </span>
              <p className="text-body-sm font-bold text-primary">Upload technical image</p>
              <p className="text-[12px] text-on-surface-variant">
                PNG, JPEG, or WebP (max 8MB)
              </p>
            </>
          )}
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onImageChange}
            className="hidden"
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-label-caps uppercase text-on-surface-variant">
          Name
        </Label>
        <Input id="name" name="name" required maxLength={200} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-label-caps uppercase text-on-surface-variant">
          Description
        </Label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          maxLength={4000}
          className="w-full rounded-md border bg-transparent px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sku" className="text-label-caps uppercase text-on-surface-variant">
            SKU
          </Label>
          <Input id="sku" name="sku" required maxLength={64} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-label-caps uppercase text-on-surface-variant">
            Category
          </Label>
          <Input id="category" name="category" maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price" className="text-label-caps uppercase text-on-surface-variant">
            Unit price (€)
          </Label>
          <Input id="price" name="priceCents" type="number" step="0.01" min="0.01" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock" className="text-label-caps uppercase text-on-surface-variant">
            Stock quantity
          </Label>
          <Input id="stock" name="stockQty" type="number" min="0" required defaultValue={0} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="h-11 w-full gap-2" disabled={submitting}>
        <span className="material-symbols-outlined text-[18px]">add</span>
        {submitting ? "Publishing…" : "Publish Product"}
      </Button>
    </form>
  );
}
