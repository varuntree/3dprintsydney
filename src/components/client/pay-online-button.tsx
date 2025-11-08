"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mutateJson } from "@/lib/http";
import { PaymentMethodModal } from "@/components/client/payment-method-modal";
import { getUserMessage } from "@/lib/errors/user-messages";

interface PayOnlineButtonProps {
  invoiceId: number;
  balanceDue: number;
  walletBalance: number;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "link" | "outline" | "secondary";
  size?: "sm" | "default" | "lg";
  children?: React.ReactNode;
}

export function PayOnlineButton({
  invoiceId,
  balanceDue,
  walletBalance,
  disabled,
  className,
  variant = "default",
  size = "default",
  children,
}: PayOnlineButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function handleDirectPayment() {
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
      toast.error(getUserMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    // If user has wallet balance, show payment method modal
    if (walletBalance > 0) {
      setShowModal(true);
    } else {
      // No wallet balance, go directly to Stripe
      void handleDirectPayment();
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children ?? "Pay Online"}
      </Button>

      <PaymentMethodModal
        open={showModal}
        onOpenChange={setShowModal}
        invoiceId={invoiceId}
        balanceDue={balanceDue}
        walletBalance={walletBalance}
      />
    </>
  );
}
