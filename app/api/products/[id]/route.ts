import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { indexProduct, deleteProductFromIndex } from "@/lib/meilisearch";

const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  sku: true,
  priceCents: true,
  currency: true,
  stockQty: true,
  category: true,
  imageUrl: true,
  status: true,
  createdAt: true,
  supplier: { select: { id: true, company: { select: { legalName: true } } } },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: PUBLIC_PRODUCT_SELECT,
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().min(1).max(4000).optional(),
  priceCents: z.number().int().positive().optional(),
  stockQty: z.number().int().min(0).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "OUT_OF_STOCK", "ARCHIVED"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.supplierId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateProductSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: parsed.data,
    select: PUBLIC_PRODUCT_SELECT,
  });

  await indexProduct({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    sku: updated.sku,
    category: updated.category,
    priceCents: updated.priceCents,
    currency: updated.currency,
    imageUrl: updated.imageUrl,
    status: updated.status,
    supplierName: updated.supplier.company.legalName,
  }).catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.supplierId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const permanent = new URL(request.url).searchParams.get("permanent") === "true";

  if (permanent) {
    if (product.status !== "ARCHIVED") {
      return NextResponse.json(
        { error: "Archive the product before deleting it permanently." },
        { status: 409 },
      );
    }
    await prisma.product.delete({ where: { id } });
    await deleteProductFromIndex(id).catch(() => {});
    return NextResponse.json({ ok: true, deleted: true });
  }

  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  await deleteProductFromIndex(id).catch(() => {});

  return NextResponse.json({ ok: true });
}
