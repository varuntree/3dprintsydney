"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  generateInvoicePdf,
  generateQuotePdf,
} from "@/lib/pdf/client";
import type {
  InvoicePdfSnapshot,
  QuotePdfSnapshot,
} from "@/lib/pdf/snapshots";

type InvoiceButtonProps = {
  documentType: "invoice";
  documentNumber: string;
  pdfSnapshot: InvoicePdfSnapshot;
  className?: string;
};

type QuoteButtonProps = {
  documentType: "quote";
  documentNumber: string;
  pdfSnapshot: QuotePdfSnapshot;
  className?: string;
};

type PdfGenerateButtonProps = InvoiceButtonProps | QuoteButtonProps;

export function PdfGenerateButton({
  documentType,
  documentNumber,
  className,
  pdfSnapshot,
}: PdfGenerateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      if (documentType === "invoice") {
        await generateInvoicePdf(pdfSnapshot, {
          filename: `${documentType}-${documentNumber}.pdf`,
        });
      } else {
        await generateQuotePdf(pdfSnapshot, {
          filename: `${documentType}-${documentNumber}.pdf`,
        });
      }
      toast.success(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} PDF generated`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to download ${documentType} PDF`;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      className={cn("gap-2 rounded-full", className)}
      disabled={loading}
      onClick={handleDownload}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {loading ? "Generating…" : "Generate PDF"}
    </Button>
  );
}
