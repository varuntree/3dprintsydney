"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUserMessage } from "@/lib/errors/user-messages";
import { buildInvoicePdfDocument, buildQuotePdfDocument } from "@/lib/pdf/data";
import { generateInvoicePdf, generateQuotePdf } from "@/lib/pdf/generator";
import type { InvoiceViewModel } from "@/components/invoices/invoice-view";
import type { QuoteViewModel } from "@/components/quotes/quote-view";

interface PdfGenerateButtonProps {
  documentType: "invoice" | "quote";
  documentNumber: string;
  data: InvoiceViewModel | QuoteViewModel;
  className?: string;
}

import { ensureInvoiceStripeCheckoutUrl } from "@/lib/pdf/stripe";

export function PdfGenerateButton({
  documentType,
  documentNumber,
  data,
  className,
}: PdfGenerateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      const filename = `${documentType}-${documentNumber}.pdf`;

      if (documentType === "invoice") {
        let invoiceData = data as InvoiceViewModel;

        // Ensure Stripe URL exists for unpaid invoices
        if (invoiceData.balanceDue > 0 && !invoiceData.stripeCheckoutUrl) {
          const url = await ensureInvoiceStripeCheckoutUrl(
            invoiceData.id,
            invoiceData.stripeCheckoutUrl
          );
          if (url) {
            invoiceData = { ...invoiceData, stripeCheckoutUrl: url };
          }
        }

        const pdfDoc = buildInvoicePdfDocument(invoiceData);
        await generateInvoicePdf(pdfDoc, filename);
      } else {
        const pdfDoc = buildQuotePdfDocument(data as QuoteViewModel);
        await generateQuotePdf(pdfDoc, filename);
      }

      toast.success(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} PDF generated`);
    } catch (error) {
      toast.error(getUserMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      className={cn("gap-2 rounded-full", className)}
      disabled={loading}
      onClick={handleDownload}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {loading ? "Generating…" : "Generate PDF"}
    </Button>
  );
}
