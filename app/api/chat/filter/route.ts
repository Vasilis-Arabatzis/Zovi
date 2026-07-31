import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { maskContactDetails } from "@/lib/masking";

async function assertOrderParticipant(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.buyerId !== userId && order.supplierId !== userId) return null;
  return order;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = await assertOrderParticipant(orderId, user.id);
  if (!order) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderId: true, maskedContent: true, flagged: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}

const messageSchema = z.object({
  orderId: z.string(),
  content: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId, content } = parsed.data;

  const order = await assertOrderParticipant(orderId, user.id);
  if (!order) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { masked, flagged } = maskContactDetails(content);

  const message = await prisma.chatMessage.create({
    data: {
      orderId,
      senderId: user.id,
      rawContent: content,
      maskedContent: masked,
      flagged,
    },
  });

  return NextResponse.json({
    id: message.id,
    senderId: message.senderId,
    content: masked,
    flagged,
    createdAt: message.createdAt,
  });
}
