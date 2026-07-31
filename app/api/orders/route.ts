import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const createOrderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10000),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers can place orders." }, { status: 403 });
  }

  const parsed = createOrderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, quantity } = parsed.data;

  const order = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== "ACTIVE") {
      throw new Error("PRODUCT_UNAVAILABLE");
    }
    if (product.stockQty < quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        stockQty: { decrement: quantity },
        status: product.stockQty - quantity <= 0 ? "OUT_OF_STOCK" : product.status,
      },
    });

    const merchandiseCents = product.priceCents * quantity;

    const escrow = await tx.escrow.create({
      data: {
        vivaReference: `VIVA-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
        heldCents: merchandiseCents,
      },
    });

    return tx.order.create({
      data: {
        buyerId: user.id,
        supplierId: product.supplierId,
        productId: product.id,
        quantity,
        merchandiseCents,
        status: "AWAITING_FREIGHT_QUOTE",
        escrowId: escrow.id,
      },
    });
  }).catch((error: Error) => {
    if (error.message === "PRODUCT_UNAVAILABLE") return null;
    if (error.message === "INSUFFICIENT_STOCK") return "INSUFFICIENT_STOCK" as const;
    throw error;
  });

  if (order === null) {
    return NextResponse.json({ error: "This product is no longer available." }, { status: 409 });
  }
  if (order === "INSUFFICIENT_STOCK") {
    return NextResponse.json({ error: "Not enough stock available." }, { status: 409 });
  }

  return NextResponse.json(order, { status: 201 });
}
