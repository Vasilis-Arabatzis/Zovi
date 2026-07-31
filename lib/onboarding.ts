export class CompanyVerificationError extends Error {}

export interface CompanyVerificationResult {
  legalName: string;
  address: string;
  activity: string;
}

async function verifyGreekCompany(taxId: string): Promise<CompanyVerificationResult> {
  const res = await fetch("https://www1.aade.gr/saadeapp2/rgwspublic2/RgWsPublic2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        `${process.env.AADE_API_USER}:${process.env.AADE_API_KEY}`,
      ).toString("base64")}`,
    },
    body: JSON.stringify({ afmCalledBy: process.env.AADE_API_USER, afmCalledFor: taxId }),
  });

  if (!res.ok) {
    throw new CompanyVerificationError(
      "Registration blocked. Could not verify corporate entity with AADE.",
    );
  }

  const data = await res.json();
  const info = data?.rgWsPublic2ResultOutRt?.arrayOfRgWsPublic2Bela?.[0];

  if (!info) {
    throw new CompanyVerificationError(
      "Registration blocked. Corporate entity was not found in the AADE registry.",
    );
  }

  if (info.comGyraDesc !== "ΕΝΕΡΓΗ" || info.deactivationFlag === "1") {
    throw new CompanyVerificationError(
      "Registration blocked. Corporate entity is inactive, suspended, or undergoing liquidation.",
    );
  }

  return {
    legalName: info.onomasia,
    address: `${info.postalAddress ?? ""} ${info.postalAddressNo ?? ""}, ${info.postalZipCode ?? ""} ${info.postalAreaDescription ?? ""}`.trim(),
    activity: info.firmActDescription ?? "",
  };
}

async function verifyEuCompany(
  countryCode: string,
  vatNumber: string,
): Promise<CompanyVerificationResult> {
  const res = await fetch(
    `${process.env.VIES_API_URL}/ms/${countryCode}/vat/${vatNumber}`,
  );

  if (!res.ok) {
    throw new CompanyVerificationError(
      "Registration blocked. Could not verify corporate entity with VIES.",
    );
  }

  const data = await res.json();

  if (!data.valid) {
    throw new CompanyVerificationError(
      "Registration blocked. Corporate entity is inactive, suspended, or undergoing liquidation.",
    );
  }

  return {
    legalName: data.name ?? "",
    address: data.address ?? "",
    activity: "",
  };
}

export async function verifyCompany(
  country: string,
  taxId: string,
): Promise<CompanyVerificationResult> {
  if (country === "GR") {
    return verifyGreekCompany(taxId);
  }
  return verifyEuCompany(country, taxId);
}
