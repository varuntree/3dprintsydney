import {
  buildInvoiceTemplate,
  buildQuoteTemplate,
} from "@/lib/pdf/builders";
import {
  renderProductionInvoiceHtml,
  renderProductionQuoteHtml,
} from "@/lib/pdf/templates/production";
import {
  snapshotToInvoice,
  snapshotToQuote,
  snapshotToSettings,
  type InvoicePdfSnapshot,
  type QuotePdfSnapshot,
} from "@/lib/pdf/snapshots";

const logoDataUrlCache = new Map<string, Promise<string | undefined>>();

export async function generateInvoicePdf(
  snapshot: InvoicePdfSnapshot,
  options: { filename: string },
) {
  const [invoice, settings, logoDataUrl] = await Promise.all([
    Promise.resolve(snapshotToInvoice(snapshot)),
    Promise.resolve(snapshotToSettings({ currency: snapshot.currency, business: snapshot.business })),
    resolveLogoDataUrl(snapshot.business.logoUrl),
  ]);

  const template = buildInvoiceTemplate(invoice, settings, logoDataUrl);
  const html = renderProductionInvoiceHtml(template);
  await renderHtmlToPdf(html, options.filename);
}

export async function generateQuotePdf(
  snapshot: QuotePdfSnapshot,
  options: { filename: string },
) {
  const [quote, settings, logoDataUrl] = await Promise.all([
    Promise.resolve(snapshotToQuote(snapshot)),
    Promise.resolve(snapshotToSettings({ currency: snapshot.currency, business: snapshot.business })),
    resolveLogoDataUrl(snapshot.business.logoUrl),
  ]);

  const template = buildQuoteTemplate(quote, settings, logoDataUrl);
  const html = renderProductionQuoteHtml(template);
  await renderHtmlToPdf(html, options.filename);
}

async function resolveLogoDataUrl(logoUrl?: string | null) {
  if (!logoUrl) return undefined;
  if (!logoDataUrlCache.has(logoUrl)) {
    logoDataUrlCache.set(
      logoUrl,
      fetch(logoUrl)
        .then(async (response) => {
          if (!response.ok) {
            return undefined;
          }
          const blob = await response.blob();
          return blobToDataUrl(blob);
        })
        .catch(() => undefined),
    );
  }
  return logoDataUrlCache.get(logoUrl) ?? Promise.resolve(undefined);
}

async function blobToDataUrl(blob: Blob): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(blob);
  });
}

async function renderHtmlToPdf(html: string, filename: string) {
  const { default: html2pdf } = await import("html2pdf.js");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "210mm";
  container.style.backgroundColor = "white";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    await html2pdf()
      .set({
        filename,
        margin: 0,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}
