export { formatCurrency } from "@/lib/currency";

export function formatAbn(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}
