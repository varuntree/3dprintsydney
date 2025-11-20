import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { createElement } from "react";
import type React from "react";
import type { InvoicePdfDocument, QuotePdfDocument } from "./types";
import { InvoiceDocument } from "./renderer/InvoiceDocument";
import { QuoteDocument } from "./renderer/QuoteDocument";

function getLogoUrl(): string | undefined {
  if (typeof window !== "undefined") {
    return window.location.origin + "/logo.png";
  }
  return undefined;
}

async function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function generateInvoicePdf(doc: InvoicePdfDocument, filename: string): Promise<void> {
  const logoUrl = getLogoUrl();
  const element = createElement(InvoiceDocument, { doc, logoUrl }) as React.ReactElement<DocumentProps>;
  const blob = await pdf(element).toBlob();
  await saveBlob(blob, filename);
}

export async function generateQuotePdf(doc: QuotePdfDocument, filename: string): Promise<void> {
  const logoUrl = getLogoUrl();
  const element = createElement(QuoteDocument, { doc, logoUrl }) as React.ReactElement<DocumentProps>;
  const blob = await pdf(element).toBlob();
  await saveBlob(blob, filename);
}
