"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mutateJson } from "@/lib/http";

interface PayOnlineButtonProps {
  invoiceId: number;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "link" | "outline" | "secondary";
  size?: "sm" | "default" | "lg";
  children?: React.ReactNode;
}

export function PayOnlineButton({
  invoiceId,
  disabled,
  className,
  variant = "default",
  size = "default",
  children,
}: PayOnlineButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (loading) return;
    setLoading(true);
    try {
      const session = await mutateJson<{ url: string | null }>(
        `/api/invoices/${invoiceId}/stripe-session?refresh=true`,
        { method: "POST" },
      );
      if (session?.url) {
        window.location.href = session.url;
      } else {
        toast.error("No checkout URL returned");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handlePay}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children ?? "Pay Online"}
    </Button>
  );
}
