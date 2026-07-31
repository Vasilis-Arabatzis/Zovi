import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { hashPassword } from "@/lib/security";

const RESET_TOKEN_TTL_SECONDS = 60 * 60;

const requestSchema = z.object({ email: z.string().email() });
const confirmSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const token = crypto.randomBytes(32).toString("base64url");
    await redis.set(`password_reset:${token}`, user.id, "EX", RESET_TOKEN_TTL_SECONDS);
    // In production: send `token` to the user via a transactional email provider.
    // Never log or return the token directly to the client.
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for this email, a reset link has been sent.",
  });
}

export async function PUT(request: NextRequest) {
  const parsed = confirmSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const userId = await redis.get(`password_reset:${token}`);

  if (!userId) {
    return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await redis.del(`password_reset:${token}`);

  const sessionsKey = `user_sessions:${userId}`;
  const activeRefreshTokens = await redis.smembers(sessionsKey);
  if (activeRefreshTokens.length > 0) {
    await redis.del(...activeRefreshTokens.map((t) => `refresh_token:${t}`));
  }
  await redis.del(sessionsKey);

  return NextResponse.json({ ok: true });
}
