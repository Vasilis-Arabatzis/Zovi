import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/jwt";

async function requireUser(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    return prisma.user.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
}

// Begin 2FA enrollment: generates a TOTP secret and a QR code to scan.
export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, "Zovi B2B Marketplace", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  return NextResponse.json({ qrCodeDataUrl });
}

const verifySchema = z.object({ code: z.string().length(6) });

// Confirm enrollment: user submits a code from their authenticator app.
export async function PUT(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.totpSecret) {
    return NextResponse.json({ error: "No pending 2FA enrollment." }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const valid = authenticator.check(parsed.data.code, user.totpSecret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid authentication code." }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });

  return NextResponse.json({ ok: true });
}

// Disable 2FA. Only allowed for buyers — suppliers and admins are required to keep it on.
export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "BUYER") {
    return NextResponse.json(
      { error: "Two-factor authentication is mandatory for this account type." },
      { status: 403 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  });

  return NextResponse.json({ ok: true });
}
