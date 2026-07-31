import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/jwt";

export async function getCurrentUser() {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    return await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { company: true },
    });
  } catch {
    return null;
  }
}

export function needsTwoFactorSetup(user: { role: string; totpEnabled: boolean }): boolean {
  return user.role !== "BUYER" && !user.totpEnabled;
}
