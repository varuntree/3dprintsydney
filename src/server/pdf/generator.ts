import { existsSync, readFileSync } from "fs";
import { join, extname } from "path";
import type { Browser } from "puppeteer-core";
import { calculateDocumentTotals } from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import { logger } from "@/lib/logger";
import { ensurePdfCache, cachePdf, resolvePdfPath } from "@/server/files/storage";
import {
  renderProductionQuoteHtml,
  renderProductionInvoiceHtml,
  type QuotePdfTemplate,
  type InvoicePdfTemplate,
  type PdfBusinessInfo,
  type PdfClientInfo,
  type PdfLineItem,
  type PdfTotals,
  type PdfPaymentSection,
  type PdfPaymentConfirmation,
  type PdfDocumentInfo,
} from "@/server/pdf/templates/production";
import { getQuoteDetail } from "@/server/services/quotes";
import { getInvoiceDetail } from "@/server/services/invoices";
import { getSettings } from "@/server/services/settings";
import { createStripeCheckoutSession } from "@/server/services/stripe";
import { uploadPdf } from "@/server/storage/supabase";
import type { QuoteDetailDTO, QuoteLineDTO } from "@/lib/types/quotes";
import type { InvoiceDetailDTO, InvoiceLineDTO, PaymentDTO } from "@/lib/types/invoices";

async function launchPdfBrowser(): Promise<Browser> {
  try {
    const [{ default: chromium }, { default: puppeteerCore }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);

    const executablePath = await chromium.executablePath();
    const browser = await puppeteerCore.launch({
      args: [...chromium.args, "--font-render-hinting=none"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
    return browser;
  } catch (error) {
    logger.warn({
      scope: "pdf.browser",
      message: "Falling back to bundled Puppeteer",
      error,
    });
    const { default: puppeteer } = await import("puppeteer");
    return puppeteer.launch({
      headless: true,
      args: ["--font-render-hinting=none"],
    });
  }
}

async function renderPdf(html: string, filename: string) {
  await ensurePdfCache();

  let browser: Browser | null = null;

  try {
    browser = await launchPdfBrowser();
  } catch (error) {
    logger.error({ scope: "pdf.browser", message: "Failed to launch browser", error });
    throw error;
  }

  let pdfBuffer: Buffer;

  try {
    const page = await browser.newPage();

    // Enhanced viewport configuration for PDF generation
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2, // Higher DPI for better quality
      hasTouch: false,
      isMobile: false,
    });

    // Set optimal page settings for PDF generation
    await page.emulateMediaType("print");

    // Additional performance optimizations
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      // Block unnecessary resources to speed up rendering
      if (req.resourceType() === "image" && !req.url().includes("data:")) {
        // Allow data URLs (base64 images) but block external images
        req.abort();
      } else if (["stylesheet", "font"].includes(req.resourceType()) || req.resourceType() === "document") {
        req.continue();
      } else if (req.resourceType() === "script") {
        // Allow scripts (needed for our measurement script)
        req.continue();
      } else {
        // Block other resources (media, xhr, fetch, etc.)
        req.abort();
      }
    });

    // Set content with enhanced loading strategy
    await page.setContent(html, {
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 30000,
    });

    // Wait for fonts and dynamic content measurement to complete
    await page.evaluateHandle("document.fonts.ready");

    // Give the dynamic pagination script time to run
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Enhanced PDF generation with quality optimizations
    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "0mm",
        bottom: "0mm",
        left: "0mm",
        right: "0mm",
      },
      tagged: true,
      outline: false,
      scale: 1.0,
    });

    pdfBuffer = Buffer.from(pdfData);
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }

  let storageKey: string | null = null;
  try {
    storageKey = await uploadPdf(filename, pdfBuffer);
  } catch (error) {
    logger.warn({
      scope: "pdf.storage.upload",
      message: "Failed to upload PDF to Supabase storage",
      error,
      data: { filename },
    });
  }

  try {
    await cachePdf(filename, pdfBuffer);
  } catch (error) {
    logger.warn({
      scope: "pdf.storage.cache",
      message: "Failed to cache PDF locally",
      error,
      data: { filename },
    });
  }

  return { buffer: pdfBuffer, filename, storageKey, path: resolvePdfPath(filename) };
}

export async function generateQuotePdf(id: number) {
  const quote = await getQuoteDetail(id);
  const settings = await getSettings().catch(() => null);
  const logoDataUrl = await resolveLogoDataUrl();

  const template = buildQuoteTemplate(quote, settings, logoDataUrl);
  const html = renderProductionQuoteHtml(template);
  const filename = `quote-${quote.number}.pdf`;
  const { buffer, path, storageKey } = await renderPdf(html, filename);
  return { buffer, filename, path, storageKey };
}

export async function generateInvoicePdf(id: number) {
  let invoice = await getInvoiceDetail(id);
  const settings = await getSettings().catch(() => null);

  if (invoice.balanceDue > 0) {
    try {
      const session = await createStripeCheckoutSession(id);
      if (session.url) {
        invoice = { ...invoice, stripeCheckoutUrl: session.url };
      }
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          (error.message === "Stripe is not configured" ||
            error.message === "Invoice is already paid")
        )
      ) {
        logger.warn({
          scope: "pdf.invoice.stripe",
          error,
          data: { invoiceId: id },
        });
      }
    }
  }

  const logoDataUrl = await resolveLogoDataUrl();

  const invoiceTemplate = buildInvoiceTemplate(invoice, settings, logoDataUrl);
  const html = renderProductionInvoiceHtml(invoiceTemplate);
  const filename = `invoice-${invoice.number}.pdf`;
  const { buffer, path, storageKey } = await renderPdf(html, filename);
  return { buffer, filename, path, storageKey };
}

type Settings = Awaited<ReturnType<typeof getSettings>>;

const REVIEW_HTML =
  'Loved our service? A <a href="https://g.page/r/CdO3kF8ywZAKEAE/review" color="#666666"><u>Google Review</u></a> would really help other customers discover us, and you\'ll receive <strong>30% off the first $100 of an order of your choice</strong> as our way of saying thanks!';

const THANK_YOU_TEXT = "Thank you for your payment!";

const DEFAULT_QUOTE_TERMS =
  "Terms & Conditions: Quote valid until expiry date. Prices include GST.\nPayment required in full before production begins.\nWe take no responsibility if 3D models are not fit for purpose - we print what you request.";

const DEFAULT_INVOICE_TERMS =
  "Terms & Conditions: Payment must be made before work commences unless otherwise agreed in writing.\nWe take no responsibility if 3D models are not fit for purpose - we print what you request.\nNo refunds will be given if printed items do not work for your intended application.";

const PAID_INVOICE_TERMS =
  "Terms & Conditions: This invoice has been paid in full.\nWe take no responsibility if 3D models are not fit for purpose - we print what you request.\nNo refunds will be given if printed items do not work for your intended application.";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

async function resolveLogoDataUrl(): Promise<string | undefined> {
  const logoFile = join(process.cwd(), "public", "logo.png");
  if (!existsSync(logoFile)) return undefined;
  try {
    const fileBuffer = readFileSync(logoFile);
    const extension = extname(logoFile).toLowerCase();
    const mimeType =
      extension === ".svg"
        ? "image/svg+xml"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : "image/png";
    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  } catch (error) {
    logger.warn({
      scope: "pdf.logo",
      message: "Unable to read logo asset",
      error,
    });
    return undefined;
  }
}

function buildQuoteTemplate(
  quote: QuoteDetailDTO,
  settings: Settings,
  logoDataUrl?: string,
): QuotePdfTemplate {
  const currency = settings?.defaultCurrency ?? "AUD";
  const business = buildBusinessInfo(settings, logoDataUrl);
  const client = buildClientInfo(quote.client);
  const expiryDate = quote.expiryDate ?? null;
  const validUntilDisplay = formatDisplayDate(expiryDate ?? quote.issueDate);
  const footerText = expiryDate
    ? `quote expires ${formatDisplayDate(expiryDate)}`
    : `quote expires ${formatDisplayDate(quote.issueDate)}`;
  const summaryText = expiryDate ? `valid until ${formatDisplayDate(expiryDate)}` : "";
  const largeAmountText = summaryText
    ? `${formatCurrency(quote.total, currency)} ${summaryText}`
    : formatCurrency(quote.total, currency);

  const lines = buildLineItems(quote.lines, currency);
  const totals = buildTotals({
    lines: quote.lines,
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    shippingCost: quote.shippingCost,
    shippingLabel: quote.shippingLabel,
    taxRate: quote.taxRate,
    total: quote.total,
    amountDueLabel: "Amount due",
    amountDueValue: quote.total,
    currency,
  });

  return {
    currency,
    business,
    client,
    logoDataUrl,
    document: {
      number: quote.number,
      issueDate: quote.issueDate,
      columns: [
        { label: "Quote number", value: quote.number },
        { label: "Valid until", value: validUntilDisplay },
        { label: "Quote terms", value: quote.paymentTerms?.label ?? "Quote Terms" },
      ],
      validUntilLabel: validUntilDisplay,
      footerText,
      largeAmountText,
    },
    lines,
    totals,
    notes: stringOrUndefined(quote.notes),
    termsConditions: stringOrUndefined(quote.terms) ?? DEFAULT_QUOTE_TERMS,
    footerReference: `${quote.number} • ${formatCurrency(quote.total, currency)} ${footerText}`,
  };
}

function buildInvoiceTemplate(
  invoice: InvoiceDetailDTO,
  settings: Settings,
  logoDataUrl?: string,
): InvoicePdfTemplate {
  const currency = settings?.defaultCurrency ?? "AUD";
  const business = buildBusinessInfo(settings, logoDataUrl);
  const client = buildClientInfo(invoice.client);
  const isPaid = invoice.status === "PAID" || invoice.balanceDue <= 0.01;
  const dueDate = invoice.dueDate ?? null;
  const dueText = isPaid
    ? "PAID"
    : dueDate
      ? `due ${formatDisplayDate(dueDate)}`
      : "due immediately";
  const paidDate = invoice.paidAt ?? invoice.payments[0]?.paidAt ?? null;

  const thirdColumn = isPaid
    ? { label: "Paid on", value: paidDate ? formatDisplayDate(paidDate) : "PAID" }
    : { label: "Payment terms", value: invoice.paymentTerms?.label ?? "COD" };

  const columns: PdfDocumentInfo["columns"] = [
    { label: "Invoice number", value: invoice.number },
    { label: "Date issued", value: formatDisplayDate(invoice.issueDate) },
    thirdColumn,
  ];

  const lines = buildLineItems(invoice.lines, currency);
  const amountDueValue = isPaid ? 0 : Math.max(0, invoice.balanceDue);
  const totals = buildTotals({
    lines: invoice.lines,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    shippingCost: invoice.shippingCost,
    shippingLabel: invoice.shippingLabel,
    taxRate: invoice.taxRate,
    total: invoice.total,
    amountDueLabel: isPaid ? "Status" : "Amount due",
    amountDueValue,
    amountDueDisplayOverride: isPaid ? "PAID" : undefined,
    currency,
  });

  const termsSource = stringOrUndefined(invoice.terms);
  const termsConditions = termsSource ?? (isPaid ? PAID_INVOICE_TERMS : DEFAULT_INVOICE_TERMS);

  return {
    currency,
    business,
    client,
    logoDataUrl,
    document: {
      number: invoice.number,
      issueDate: invoice.issueDate,
      columns,
      footerText: dueText,
      largeAmountText: isPaid
        ? `${formatCurrency(invoice.total, currency)} PAID`
        : `${formatCurrency(invoice.total, currency)} ${dueText}`,
      isPaid,
      paidIndicator: isPaid,
    },
    lines,
    totals,
    notes: stringOrUndefined(invoice.notes),
    termsConditions,
    footerReference: `${invoice.number} • ${formatCurrency(invoice.total, currency)} ${dueText}`,
    reviewHtml: isPaid ? undefined : REVIEW_HTML,
    thankYouText: isPaid ? THANK_YOU_TEXT : undefined,
    paymentSection: isPaid ? undefined : buildPaymentSection(invoice, settings),
    paymentConfirmation: isPaid ? buildPaymentConfirmation(invoice) : undefined,
  };
}

function buildBusinessInfo(settings: Settings, logoDataUrl?: string): PdfBusinessInfo {
  return {
    name: settings?.businessName ?? "3D Print Sydney",
    address: stringOrUndefined(settings?.businessAddress),
    email: stringOrUndefined(settings?.businessEmail),
    phone: stringOrUndefined(settings?.businessPhone),
    abn: stringOrUndefined(settings?.abn),
    bankDetails: stringOrUndefined(settings?.bankDetails),
    logoDataUrl,
  };
}

function buildClientInfo(client: QuoteDetailDTO["client"] | InvoiceDetailDTO["client"]): PdfClientInfo {
  return {
    name: client.name,
    company: client.company ?? null,
    email: client.email ?? null,
    phone: client.phone ?? null,
    address: client.address ?? null,
  };
}

function buildPaymentSection(
  invoice: InvoiceDetailDTO,
  settings: Settings,
): PdfPaymentSection | undefined {
  const bankDetails = stringOrUndefined(settings?.bankDetails);
  const stripeUrl = invoice.stripeCheckoutUrl ?? undefined;
  if (!bankDetails && !stripeUrl) {
    return undefined;
  }
  return {
    bankDetails,
    stripeUrl,
    amountDue: Math.max(0, invoice.balanceDue),
    reference: invoice.number,
  };
}

function buildPaymentConfirmation(invoice: InvoiceDetailDTO): PdfPaymentConfirmation | undefined {
  if (invoice.payments.length === 0 && !invoice.paidAt) {
    return undefined;
  }

  const primaryPayment = invoice.payments[0] as PaymentDTO | undefined;
  const amount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    method: primaryPayment ? formatPaymentMethod(primaryPayment.method) : undefined,
    paidDate: primaryPayment?.paidAt ?? invoice.paidAt ?? null,
    reference: stringOrUndefined(primaryPayment?.reference),
    amount: amount > 0 ? amount : invoice.total,
  };
}

function buildLineItems(
  lines: (QuoteLineDTO | InvoiceLineDTO)[],
  currency: string,
): PdfLineItem[] {
  return lines.map((line) => {
    const quantity = line.quantity ?? 0;
    const originalUnitPrice = line.unitPrice ?? 0;
    const discount = computeLineDiscount(line, quantity, originalUnitPrice, currency);
    return {
      title: line.name,
      description: stringOrUndefined(line.description),
      detailLines: buildCalculatorDetailLines(line.calculatorBreakdown as Record<string, unknown> | null),
      quantityDisplay: toQuantityDisplay(quantity),
      originalUnitPrice,
      discountedUnitPrice: discount.discountedUnitPrice,
      total: line.total ?? 0,
      discountDisplay: discount.display,
      discountNote: discount.note,
    };
  });
}

function buildTotals(params: {
  lines: (QuoteLineDTO | InvoiceLineDTO)[];
  discountType: string;
  discountValue: number | null | undefined;
  shippingCost: number | null | undefined;
  shippingLabel?: string | null;
  taxRate: number | null | undefined;
  total: number;
  amountDueLabel: string;
  amountDueValue: number;
  amountDueDisplayOverride?: string;
  currency: string;
}): PdfTotals {
  const docTotals = calculateDocumentTotals({
    lines: params.lines.map((line) => ({ total: line.total ?? 0 })),
    discountType: params.discountType as "NONE" | "PERCENT" | "FIXED",
    discountValue: params.discountValue ?? 0,
    shippingCost: params.shippingCost ?? 0,
    taxRate: params.taxRate ?? 0,
  });

  const discountAmount = Math.max(0, docTotals.subtotal - docTotals.discounted);
  const totals: PdfTotals = {
    subtotal: docTotals.subtotal,
    total: params.total,
    amountDue: {
      label: params.amountDueLabel,
      amount: Math.max(0, params.amountDueValue),
      displayOverride: params.amountDueDisplayOverride,
    },
  };

  if (discountAmount > 0.0001) {
    totals.discount = {
      label: "Discount",
      amount: discountAmount,
      subtotalAfter: docTotals.discounted,
    };
  }

  if ((params.shippingCost ?? 0) > 0.0001) {
    totals.shipping = {
      label: params.shippingLabel && params.shippingLabel.trim().length > 0
        ? params.shippingLabel.trim()
        : "Shipping",
      amount: params.shippingCost ?? 0,
    };
  }

  if (docTotals.tax > 0.0001) {
    const taxRate = params.taxRate ?? 0;
    const taxLabel = taxRate > 0 ? `Tax (${Math.round(taxRate)}%)` : "Tax";
    totals.tax = {
      label: taxLabel,
      amount: docTotals.tax,
    };
  }

  return totals;
}

function computeLineDiscount(
  line: QuoteLineDTO | InvoiceLineDTO,
  quantity: number,
  unitPrice: number,
  currency: string,
): { discountedUnitPrice: number; display?: string; note?: string } {
  const discountNameCandidates: Array<unknown> = [
    (line as { discountName?: string }).discountName,
    (line as unknown as { discount_label?: string }).discount_label,
  ];
  const breakdown = line.calculatorBreakdown as Record<string, unknown> | null;
  if (breakdown) {
    discountNameCandidates.push(
      breakdown.discountName,
      breakdown.discount_name,
      breakdown.discountLabel,
    );
  }
  const discountName = discountNameCandidates
    .map((value) => {
      if (value === undefined || value === null) return "";
      return String(value).trim();
    })
    .find((value) => value.length > 0) ?? "";

  const discountType = line.discountType ?? "NONE";
  const discountValue = line.discountValue ?? 0;
  if (discountType === "PERCENT" && discountValue > 0) {
    const discountedUnit = Math.max(0, unitPrice * (1 - discountValue / 100));
    const display = `${Number(discountValue.toFixed(2)).toString().replace(/\.00$/, "")}%`;
    return {
      discountedUnitPrice: discountedUnit,
      display,
      note: discountName || undefined,
    };
  }

  if (discountType === "FIXED" && discountValue > 0) {
    const perUnit = quantity > 0 ? discountValue / quantity : discountValue;
    const discountedUnit = Math.max(0, unitPrice - perUnit);
    const display = formatCurrency(discountValue, currency);
    return {
      discountedUnitPrice: discountedUnit,
      display,
      note: discountName || undefined,
    };
  }

  return { discountedUnitPrice: unitPrice };
}

function buildCalculatorDetailLines(breakdown: Record<string, unknown> | null): string[] {
  if (!breakdown) return [];
  const lines: string[] = [];
  const handled = new Set<string>();

  const stringFrom = (...keys: string[]) => {
    for (const key of keys) {
      const value = breakdown[key];
      if (value === undefined || value === null) continue;
      if (typeof value === "string" && value.trim().length > 0) {
        handled.add(key);
        return value.trim();
      }
    }
    return undefined;
  };

  const numberFrom = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = breakdown[key];
      if (value === undefined || value === null) continue;
      if (typeof value === "number" && Number.isFinite(value)) {
        handled.add(key);
        return value;
      }
    }
    return undefined;
  };

  const material = stringFrom("material", "materialName");
  if (material) lines.push(`Material: ${material}`);

  const quality = stringFrom("quality", "surfaceQuality");
  if (quality) lines.push(`Quality: ${quality}`);

  const layerHeight = numberFrom("layerHeight", "layer_height", "layer_height_mm");
  if (layerHeight !== undefined) {
    const display = Number(layerHeight.toFixed(2)).toString().replace(/\.00$/, "");
    lines.push(`Layer Height: ${display} mm`);
  }

  const infill = numberFrom("infill", "infillPercentage");
  if (infill !== undefined) {
    lines.push(`Infill: ${Number(infill.toFixed(0))}%`);
  }

  const printHours = numberFrom("hours", "timeHours", "printTimeHours");
  if (printHours !== undefined) {
    lines.push(`Print Time: ${printHours.toFixed(1)} hours`);
  }

  const grams = numberFrom("grams", "weight", "filamentWeight", "materialGrams");
  if (grams !== undefined) {
    lines.push(`Filament Used: ${Math.round(grams)} g`);
  }

  for (const [key, value] of Object.entries(breakdown)) {
    if (handled.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    const text = typeof value === "number" ? value.toString() : String(value);
    if (text.trim().length === 0) continue;
    lines.push(`${humanizeKey(key)}: ${text.trim()}`);
  }

  return lines;
}

function toQuantityDisplay(quantity: number): string {
  if (Number.isInteger(quantity)) {
    return `${quantity}`;
  }
  const rounded = Number(quantity.toFixed(1));
  return `${rounded}`;
}

function stringOrUndefined(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function formatDisplayDate(date: Date | null | undefined): string {
  if (!date) return "N/A";
  return date.toLocaleDateString("en-US", DATE_FORMAT);
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatPaymentMethod(method: PaymentDTO["method"]): string {
  return humanizeKey(method.toLowerCase());
}
