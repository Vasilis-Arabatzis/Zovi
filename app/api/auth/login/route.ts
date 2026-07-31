import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  verifyPassword,
  RateLimitExceededError,
} from "@/lib/security";
import { signSessionToken } from "@/lib/jwt";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function issueSession(userId: string, role: string, extra: Record<string, unknown> = {}) {
  const accessToken = await signSessionToken({ sub: userId, role: role as never });

  const refreshToken = crypto.randomBytes(32).toString("base64url");
  await redis.set(`refresh_token:${refreshToken}`, userId, "EX", REFRESH_TOKEN_TTL_SECONDS);
  await redis.sadd(`user_sessions:${userId}`, refreshToken);

  const response = NextResponse.json({ ok: true, role, ...extra });
  response.cookies.set("auth_token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
    path: "/",
  });
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
    path: "/api/auth",
  });

  return response;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await checkLoginRateLimit(ip);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  const { email, password, totpCode } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordValid = user ? await verifyPassword(user.passwordHash, password) : false;

  if (!user || !passwordValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const requires2fa = user.role !== "BUYER" || user.totpEnabled;

  if (requires2fa) {
    if (!user.totpEnabled || !user.totpSecret) {
      // 2FA is mandatory for this role but hasn't been set up yet. Rather than
      // permanently locking the account out, issue a normal session and let the
      // client route to the mandatory setup screen before granting dashboard access.
      await resetLoginRateLimit(ip);
      return issueSession(user.id, user.role, { requires2faSetup: true });
    }

    if (!totpCode) {
      return NextResponse.json({ requiresTotp: true }, { status: 200 });
    }

    const validTotp = authenticator.check(totpCode, user.totpSecret);
    if (!validTotp) {
      return NextResponse.json({ error: "Invalid authentication code." }, { status: 401 });
    }
  }

  await resetLoginRateLimit(ip);
  return issueSession(user.id, user.role);
}
