// Shared utilities and constants for PDF generation

// Color scheme from recovered templates
export const COLORS = {
  darkText: "#1a1a1a",
  mediumText: "#4a4a4a",
  lightText: "#666666",
  accentBlue: "#6366f1",
  lightGray: "#f8f9fa",
  borderGray: "#e5e7eb",
  footerGray: "#999999",
  paidGreen: "#059669",
} as const;

// Format date as "15 November 2024"
export function formatDate(dateString: string | null): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Format currency as "$150.00"
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

// Format discount label
export function discountLabel(discountType: string, discountValue: number | null): string {
  if (!discountValue) return "";

  if (discountType === "percentage") {
    return `${discountValue}%`;
  }
  return formatCurrency(discountValue);
}

// Parse calculator breakdown from description
export function parseCalculatorBreakdown(description: string | null): string[] {
  if (!description) return [];

  const lines: string[] = [];
  const keyMap: Record<string, string> = {
    material: "Material",
    quality: "Quality",
    layer_height_mm: "Layer Height (mm)",
    infill_percent: "Infill (%)",
    print_time_hours: "Print Time (hours)",
    filament_used_g: "Filament Used (g)",
  };

  const descLines = description.split("\n");
  for (const line of descLines) {
    const match = line.match(/^([a-z_]+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      const label = keyMap[key] || key;
      lines.push(`${label}: ${value}`);
    }
  }

  return lines;
}

// Escape HTML entities
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Format multiline text (convert newlines to array)
export function formatMultiline(text: string): string[] {
  return text.split("\n").filter((line) => line.trim().length > 0);
}

// Default terms for unpaid invoices
export const DEFAULT_UNPAID_TERMS = `Terms & Conditions: Payment must be made before work commences unless otherwise agreed in writing.
We take no responsibility if 3D models are not fit for purpose - we print what you request.
No refunds will be given if printed items do not work for your intended application.`;

// Default terms for paid invoices
export const DEFAULT_PAID_TERMS = `Terms & Conditions: This invoice has been paid in full.
We take no responsibility if 3D models are not fit for purpose - we print what you request.
No refunds will be given if printed items do not work for your intended application.`;

// Default terms for quotes
export const DEFAULT_QUOTE_TERMS = `Terms & Conditions: Quote valid until expiry date. Prices include GST.
Payment required in full before production begins.
We take no responsibility if 3D models are not fit for purpose - we print what you request.`;

// Google Review HTML (from recovered template)
export const REVIEW_HTML = `Loved our service? A <span style="text-decoration: underline;">Google Review</span> would really help other customers discover us, and you'll receive <strong>30% off the first $100 of an order of your choice</strong> as our way of saying thanks!`;

// Google Review URL
export const REVIEW_URL = "https://g.page/r/CdO3kF8ywZAKEAE/review";
