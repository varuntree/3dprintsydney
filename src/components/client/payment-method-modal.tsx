"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Wallet, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { mutateJson } from "@/lib/http";
import { cn } from "@/lib/utils";
import { getUserMessage } from "@/lib/errors/user-messages";

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  balanceDue: number;
  walletBalance: number;
}

export function PaymentMethodModal({
  open,
  onOpenChange,
  invoiceId,
  balanceDue,
  walletBalance,
}: PaymentMethodModalProps) {
  const [useCredit, setUseCredit] = useState(walletBalance > 0);
  const [processing, setProcessing] = useState(false);
  const maxCredit = useMemo(() => Math.min(walletBalance, balanceDue), [walletBalance, balanceDue]);
  const [creditInput, setCreditInput] = useState(maxCredit.toFixed(2));
  const effectiveCreditAmount = useMemo(() => {
    if (!useCredit) return 0;
    const parsed = Number.parseFloat(creditInput);
    const normalized = Number.isFinite(parsed) ? parsed : 0;
    if (normalized <= 0) return 0;
    return Math.min(maxCredit, normalized);
  }, [creditInput, maxCredit, useCredit]);
  const remainingAfterCredit = Math.max(0, balanceDue - effectiveCreditAmount);

  useEffect(() => {
    if (maxCredit === 0) {
      setUseCredit(false);
      setCreditInput("0");
      return;
    }
    setCreditInput((prev) => {
      const parsed = Number.parseFloat(prev);
      if (!Number.isFinite(parsed)) return maxCredit.toFixed(2);
      if (parsed < 0) return "0";
      if (parsed > maxCredit) return maxCredit.toFixed(2);
      return prev;
    });
  }, [maxCredit]);

  async function handleProceed() {
    setProcessing(true);
    try {
      if (effectiveCreditAmount > 0) {
        const result = await mutateJson<{
          creditApplied: number;
          newBalanceDue: number;
          fullyPaid: boolean;
        }>(`/api/invoices/${invoiceId}/apply-credit`, {
          method: "POST",
          body: JSON.stringify({ amount: effectiveCreditAmount }),
        });

        if (result.fullyPaid) {
          toast.success(
            `Payment successful! ${formatCurrency(result.creditApplied)} applied from your wallet.`
          );
          onOpenChange(false);
          setTimeout(() => window.location.reload(), 1500);
          return;
        }

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
          return;
        }
        toast.error("No checkout URL returned");
        setProcessing(false);
        return;
      }

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
    } catch (error) {
      toast.error(getUserMessage(error));
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

        {/* Balance Summary - Mobile optimized: Reduced padding on mobile */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
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
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface-overlay p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Invoice total</span>
              <span className="font-semibold">{formatCurrency(balanceDue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Wallet balance</span>
              <span className="font-semibold text-green-600">{formatCurrency(walletBalance)}</span>
            </div>
          </div>

          <RadioGroup value={useCredit ? "credit" : "card"} onValueChange={(value) => setUseCredit(value === "credit")}> 
            <div className="space-y-3">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3",
                  !useCredit ? "border-primary bg-primary/5" : "hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="card" className="mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Charge card only</p>
                  <p className="text-xs text-muted-foreground">Save credits for another order</p>
                </div>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3",
                  useCredit ? "border-primary bg-primary/5" : "hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="credit" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold">Apply wallet credit</p>
                  <p className="text-xs text-muted-foreground">
                    Up to {formatCurrency(maxCredit)} available
                  </p>
                </div>
              </label>
            </div>
          </RadioGroup>

          {useCredit ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Credit amount</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreditInput(maxCredit.toFixed(2))}
                >
                  Max
                </Button>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={maxCredit}
                className="h-9"
                value={creditInput}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCreditInput(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Remaining after credit: {formatCurrency(remainingAfterCredit)}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-muted/20 p-3 text-sm">
            <p className="text-muted-foreground">Credit applied</p>
            <div className="text-lg font-semibold text-foreground">{formatCurrency(effectiveCreditAmount)}</div>
            <p className="text-muted-foreground">
              Card will cover {formatCurrency(remainingAfterCredit)}
            </p>
          </div>
        </div>

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
