import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const quoteSchema = z.object({
  action: z.literal("quote"),
  freightCents: z.number().int().nonnegative(),
});

const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

const completeSchema = z.object({
  action: z.literal("complete"),
});

const bodySchema = z.union([quoteSchema, decisionSchema, completeSchema]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "quote") {
    if (order.supplierId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.status !== "AWAITING_FREIGHT_QUOTE") {
      return NextResponse.json({ error: "Order is not awaiting a freight quote." }, { status: 409 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { freightCents: parsed.data.freightCents, status: "FREIGHT_QUOTED" },
    });
    return NextResponse.json(updated);
  }

  if (parsed.data.action === "complete") {
    if (order.buyerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.status !== "IN_TRANSIT") {
      return NextResponse.json(
        { error: "Only in-transit orders can be marked as delivered." },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({ where: { id }, data: { status: "COMPLETED" } });
      if (order.escrowId) {
        const escrow = await tx.escrow.findUnique({ where: { id: order.escrowId } });
        if (escrow) {
          await tx.escrow.update({
            where: { id: order.escrowId },
            data: { releasedCents: escrow.heldCents },
          });
        }
      }
      return result;
    });

    // NOTE: real fund release to the supplier's Viva.com wallet happens here
    // once VIVA_* credentials are configured.

    return NextResponse.json(updated);
  }

  // approve / reject
  if (order.buyerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "FREIGHT_QUOTED") {
    return NextResponse.json({ error: "Order has no pending freight quote." }, { status: 409 });
  }

  const nextStatus = parsed.data.action === "approve" ? "IN_TRANSIT" : "CANCELLED";
  const updated = await prisma.order.update({
    where: { id },
    data: { status: nextStatus },
  });

  // NOTE: real settlement (charging the freight delta, or reversing the escrow
  // hold via Viva.com) happens here once VIVA_* credentials are configured.

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.buyerId !== user.id && order.supplierId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "CANCELLED") {
    return NextResponse.json(
      { error: "Only cancelled orders can be deleted." },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });

    if (order.escrowId) {
      const remaining = await tx.order.count({ where: { escrowId: order.escrowId } });
      if (remaining === 0) {
        await tx.escrow.delete({ where: { id: order.escrowId } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
