"use client";

import { useState } from "react";
import { ChevronDown, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export interface PDFStyle {
  id: string;
  name: string;
  description: string;
}

const PDF_STYLES: PDFStyle[] = [
  { id: "classic", name: "Classic Traditional", description: "Standard layout with borders and traditional styling" },
  { id: "minimal", name: "Modern Minimal", description: "Clean lines with lots of white space" },
  { id: "corporate", name: "Corporate Professional", description: "Formal layout with strong header" },
  { id: "lineart", name: "Simple Line Art", description: "Thin line separators, geometric layout" },
  { id: "compact", name: "Compact Dense", description: "Maximum information in minimum space" },
  { id: "bold", name: "Bold Headers", description: "Large section headings, strong hierarchy" },
  { id: "leftalign", name: "Left-Aligned Clean", description: "Everything aligned to left margin" },
  { id: "twocolumn", name: "Two-Column Layout", description: "Balanced business info and invoice details" },
  { id: "invoicefirst", name: "Invoice-First", description: "Large invoice number and amount prominent" },
  { id: "stripe", name: "Stripe-Inspired Simple", description: "Clean, modern but not complex" }
];

interface PDFStyleDropdownProps {
  documentType: "invoice" | "quote";
  documentId: number;
  documentNumber: string;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: string) => void;
}

export function PDFStyleDropdown({
  documentType,
  documentId,
  documentNumber,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError
}: PDFStyleDropdownProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const downloadPdf = async (style: PDFStyle) => {
    setIsGenerating(style.id);
    onDownloadStart?.();

    try {
      const response = await fetch(`/api/${documentType}s/${documentId}/pdf?style=${style.id}`);
      if (!response.ok) throw new Error(`Failed to generate ${documentType} PDF`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${documentType}-${documentNumber}-${style.id}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast.success(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} PDF generated (${style.name})`);
      onDownloadComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to download ${documentType} PDF`;
      toast.error(message);
      onDownloadError?.(message);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isGenerating !== null}>
          <FileText className="w-4 h-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate PDF"}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {PDF_STYLES.map((style) => (
          <DropdownMenuItem
            key={style.id}
            onClick={() => downloadPdf(style)}
            disabled={isGenerating !== null}
            className="flex-col items-start p-3 cursor-pointer"
          >
            <div className="flex items-center w-full">
              <Download className="w-4 h-4 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{style.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{style.description}</div>
              </div>
              {isGenerating === style.id && (
                <div className="ml-2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}