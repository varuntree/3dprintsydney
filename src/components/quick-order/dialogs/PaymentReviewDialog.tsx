import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/currency";

type PaymentReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTotal: number;
  shipping: number;
  walletBalance: number;
  applyCredit: boolean;
  onApplyCreditChange: (applyCredit: boolean) => void;
  creditManualEntry: string;
  onCreditManualEntryChange: (value: string) => void;
  maxCreditAvailable: number;
  effectiveCreditAmount: number;
  remainingBalance: number;
  onConfirm: () => void;
  loading?: boolean;
};

export function PaymentReviewDialog({
  open,
  onOpenChange,
  projectTotal,
  shipping,
  walletBalance,
  applyCredit,
  onApplyCreditChange,
  creditManualEntry,
  onCreditManualEntryChange,
  maxCreditAvailable,
  effectiveCreditAmount,
  remainingBalance,
  onConfirm,
  loading = false,
}: PaymentReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review payment</DialogTitle>
          <DialogDescription>
            Choose how much of your wallet credit to apply before charging your card.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface-overlay p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Project total</span>
              <span className="font-semibold">{formatCurrency(projectTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span className="font-semibold text-blue-600">{formatCurrency(shipping)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Wallet balance</span>
              <span className="font-semibold text-green-600">{formatCurrency(walletBalance)}</span>
            </div>
          </div>

          <RadioGroup value={applyCredit ? "credit" : "card"} onValueChange={(value) => onApplyCreditChange(value === "credit")}>
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-lg border border-border p-3">
                <RadioGroupItem value="card" />
                <div>
                  <p className="text-sm font-semibold">Pay with card only</p>
                  <p className="text-xs text-muted-foreground">Save your credits for later</p>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-border p-3">
                <RadioGroupItem value="credit" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold">Apply wallet credit</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(maxCreditAvailable)} available to use</p>
                </div>
              </label>
            </div>
          </RadioGroup>

          {applyCredit ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Credit amount</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCreditManualEntryChange(maxCreditAvailable.toFixed(2))}
                >
                  Max
                </Button>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={maxCreditAvailable}
                value={creditManualEntry}
                onChange={(event) => onCreditManualEntryChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You&rsquo;ll pay {formatCurrency(remainingBalance)} after the credit is applied.
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-muted/20 p-3 text-sm">
            <p className="text-muted-foreground">Credit applied</p>
            <div className="text-lg font-semibold text-foreground">{formatCurrency(effectiveCreditAmount)}</div>
            <p className="text-muted-foreground">Remaining balance: {formatCurrency(remainingBalance)}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Processing..." : "Continue to payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
