import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/security";
import { redis } from "@/lib/redis";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Invalidate every other active session so a compromised session can't persist.
  const sessionsKey = `user_sessions:${user.id}`;
  const activeRefreshTokens = await redis.smembers(sessionsKey);
  if (activeRefreshTokens.length > 0) {
    await redis.del(...activeRefreshTokens.map((t) => `refresh_token:${t}`));
  }
  await redis.del(sessionsKey);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("auth_token");
  response.cookies.delete("refresh_token");
  return response;
}
