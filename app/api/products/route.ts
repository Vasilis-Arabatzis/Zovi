import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveProductImage, InvalidImageError } from "@/lib/storage";
import { indexProduct, searchProducts } from "@/lib/meilisearch";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();

  if (query) {
    try {
      const hits = await searchProducts(query);
      return NextResponse.json({ products: hits, source: "search" });
    } catch {
      // Meilisearch unreachable — fall through to Postgres search below.
    }
  }

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
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
    },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return NextResponse.json({ products, source: "database" });
}

const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(1).max(4000),
  sku: z.string().min(2).max(64),
  priceCents: z.coerce.number().int().positive(),
  stockQty: z.coerce.number().int().min(0),
  category: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPPLIER") {
    return NextResponse.json({ error: "Only suppliers can list products." }, { status: 403 });
  }

  const formData = await request.formData();
  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    sku: formData.get("sku"),
    priceCents: formData.get("priceCents"),
    stockQty: formData.get("stockQty"),
    category: formData.get("category") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingSku = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existingSku) {
    return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 409 });
  }

  let imageUrl: string | null = null;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imageUrl = await saveProductImage(imageFile);
    } catch (error) {
      if (error instanceof InvalidImageError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      imageUrl,
      supplierId: user.id,
    },
    select: {
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
    },
  });

  await indexProduct({
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    category: product.category,
    priceCents: product.priceCents,
    currency: product.currency,
    imageUrl: product.imageUrl,
    status: product.status,
    supplierName: product.supplier.company.legalName,
  }).catch(() => {
    // Search indexing is best-effort; the product still exists in Postgres.
  });

  return NextResponse.json(product, { status: 201 });
}
