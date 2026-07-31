import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    await redis.del(`refresh_token:${refreshToken}`);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("auth_token");
  response.cookies.delete("refresh_token");
  return response;
}
