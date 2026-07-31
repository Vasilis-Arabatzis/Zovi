import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security";
import { verifyCompany, CompanyVerificationError } from "@/lib/onboarding";

const onboardingSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().length(2),
  taxId: z.string().min(4),
  role: z.enum(["BUYER", "SUPPLIER"]),
});

export async function POST(request: NextRequest) {
  const parsed = onboardingSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, country, taxId, role } = parsed.data;

  const existingCompany = await prisma.company.findUnique({ where: { taxId } });
  if (existingCompany) {
    return NextResponse.json(
      { error: "A company with this Tax ID is already registered." },
      { status: 409 },
    );
  }

  let verification;
  try {
    verification = await verifyCompany(country, taxId);
  } catch (error) {
    if (error instanceof CompanyVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const company = await prisma.company.create({
    data: {
      legalName: verification.legalName,
      taxId,
      country,
      address: verification.address,
      activity: verification.activity,
      status: "ACTIVE",
      users: {
        create: {
          email,
          passwordHash,
          role,
        },
      },
    },
    include: { users: true },
  });

  return NextResponse.json(
    { companyId: company.id, legalName: company.legalName },
    { status: 201 },
  );
}
