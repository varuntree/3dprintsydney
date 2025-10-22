"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Wallet, CreditCard, DollarSign, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { mutateJson } from "@/lib/http";
import { cn } from "@/lib/utils";

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  balanceDue: number;
  walletBalance: number;
}

type PaymentOption = "credit-only" | "credit-and-card" | "card-only";

export function PaymentMethodModal({
  open,
  onOpenChange,
  invoiceId,
  balanceDue,
  walletBalance,
}: PaymentMethodModalProps) {
  const [selectedOption, setSelectedOption] = useState<PaymentOption>(
    walletBalance >= balanceDue ? "credit-only" : "credit-and-card"
  );
  const [processing, setProcessing] = useState(false);

  const canPayWithCreditOnly = walletBalance >= balanceDue;
  const creditToApply = Math.min(walletBalance, balanceDue);
  const remainingAfterCredit = Math.max(0, balanceDue - walletBalance);

  async function handleProceed() {
    setProcessing(true);
    try {
      if (selectedOption === "card-only") {
        // Skip credit, go directly to Stripe
        const session = await mutateJson<{ url: string | null }>(
          `/api/invoices/${invoiceId}/stripe-session?refresh=true`,
          { method: "POST" }
        );
        if (session?.url) {
          window.location.href = session.url;
        } else {
          toast.error("No checkout URL returned");
          setProcessing(false);
        }
      } else {
        // Apply credit first
        const result = await mutateJson<{
          creditApplied: number;
          newBalanceDue: number;
          fullyPaid: boolean;
        }>(`/api/invoices/${invoiceId}/apply-credit`, { method: "POST" });

        if (result.fullyPaid) {
          // Fully paid with credit
          toast.success(
            `Payment successful! ${formatCurrency(result.creditApplied)} applied from your wallet.`
          );
          onOpenChange(false);
          // Reload page to show updated status
          setTimeout(() => window.location.reload(), 1500);
        } else {
          // Partial payment, proceed to Stripe for remaining
          const session = await mutateJson<{ url: string | null }>(
            `/api/invoices/${invoiceId}/stripe-session?refresh=true`,
            { method: "POST" }
          );
          if (session?.url) {
            toast.success(
              `${formatCurrency(result.creditApplied)} applied from your wallet. Redirecting to payment...`
            );
            setTimeout(() => {
              window.location.href = session.url!;
            }, 1000);
          } else {
            toast.error("No checkout URL returned");
            setProcessing(false);
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Payment Method</DialogTitle>
          <DialogDescription>
            Select how you&apos;d like to pay for this invoice
          </DialogDescription>
        </DialogHeader>

        {/* Balance Summary */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invoice Balance:</span>
            <span className="font-semibold">{formatCurrency(balanceDue)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Available Credit:</span>
            </div>
            <span className="font-semibold text-green-700 dark:text-green-400">
              {formatCurrency(walletBalance)}
            </span>
          </div>
        </div>

        {/* Payment Options */}
        <RadioGroup value={selectedOption} onValueChange={(val) => setSelectedOption(val as PaymentOption)}>
          <div className="space-y-3">
            {/* Option 1: Credit Only */}
            {canPayWithCreditOnly ? (
              <label
                htmlFor="credit-only"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors",
                  selectedOption === "credit-only"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="credit-only" id="credit-only" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <Label htmlFor="credit-only" className="cursor-pointer font-semibold">
                      Use Credits Only
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pay {formatCurrency(balanceDue)} from your wallet balance
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Remaining: {formatCurrency(walletBalance - balanceDue)}
                  </p>
                </div>
              </label>
            ) : null}

            {/* Option 2: Credit + Card */}
            {walletBalance > 0 ? (
              <label
                htmlFor="credit-and-card"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors",
                  selectedOption === "credit-and-card"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="credit-and-card" id="credit-and-card" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <DollarSign className="h-4 w-4" />
                    <Label htmlFor="credit-and-card" className="cursor-pointer font-semibold">
                      Use Credits + Card
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Apply {formatCurrency(creditToApply)} credit, pay {formatCurrency(remainingAfterCredit)} via card
                  </p>
                </div>
              </label>
            ) : null}

            {/* Option 3: Card Only */}
            <label
              htmlFor="card-only"
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors",
                selectedOption === "card-only"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="card-only" id="card-only" className="mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <Label htmlFor="card-only" className="cursor-pointer font-semibold">
                    Pay Full Amount via Card
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Save credits for later, pay {formatCurrency(balanceDue)} now
                </p>
              </div>
            </label>
          </div>
        </RadioGroup>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleProceed} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue to Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
