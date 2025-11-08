"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUserMessage } from "@/lib/errors/user-messages";

interface PdfGenerateButtonProps {
  documentType: "invoice" | "quote";
  documentId: number;
  documentNumber: string;
  className?: string;
}

export function PdfGenerateButton({
  documentType,
  documentId,
  documentNumber,
  className,
}: PdfGenerateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/${documentType}s/${documentId}/pdf`);
      if (!response.ok) {
        throw new Error(`Failed to generate ${documentType} PDF`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${documentType}-${documentNumber}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} PDF generated`);
    } catch (error) {
      toast.error(getUserMessage(error));
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
