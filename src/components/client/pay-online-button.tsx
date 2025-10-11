"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      const res = await fetch(`/api/invoices/${invoiceId}/stripe-session?refresh=true`, {
        method: "POST",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = typeof payload?.error === "string" ? payload.error : "Unable to start payment";
        toast.error(message);
        return;
      }
      const payload = (await res.json()) as { url: string | null };
      if (payload.url) {
        window.location.href = payload.url;
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
