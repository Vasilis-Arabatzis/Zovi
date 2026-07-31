const PHONE_PATTERN = /(?:\+?\d[\s.-]?){8,}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IBAN_PATTERN = /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}\b/g;

export interface MaskResult {
  masked: string;
  flagged: boolean;
}

export function maskContactDetails(content: string): MaskResult {
  let flagged = false;
  const masked = content
    .replace(IBAN_PATTERN, () => {
      flagged = true;
      return "**********";
    })
    .replace(EMAIL_PATTERN, () => {
      flagged = true;
      return "**********";
    })
    .replace(PHONE_PATTERN, () => {
      flagged = true;
      return "**********";
    });

  return { masked, flagged };
}
