import { format, parseISO } from "date-fns";

export function formatDate(
  value: Date | string | null | undefined,
  pattern = "d MMM yyyy",
) {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
}

export function isoNow() {
  return new Date().toISOString();
}

export function addDays(date: Date, count: number) {
  return new Date(date.getTime() + count * 24 * 60 * 60 * 1000);
}
