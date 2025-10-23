export const STUDENT_DISCOUNT_RATE = 20;

function extractDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return null;
  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  return domain.length > 0 ? domain : null;
}

export function isStudentEmail(email: string | null | undefined): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;
  const parts = domain.split(".").map((segment) => segment.trim());
  return parts.includes("edu");
}

export function resolveStudentDiscount(email: string | null | undefined): {
  eligible: boolean;
  rate: number;
} {
  const eligible = isStudentEmail(email);
  return {
    eligible,
    rate: eligible ? STUDENT_DISCOUNT_RATE : 0,
  };
}
