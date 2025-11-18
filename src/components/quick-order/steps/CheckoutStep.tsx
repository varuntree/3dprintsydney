import { useState, useEffect, useMemo } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuickOrder } from "../context/QuickOrderContext";
import { PaymentReviewDialog } from "../dialogs/PaymentReviewDialog";

export function CheckoutStep() {
  const {
    priceData,
    shippingQuote,
    address,
    setAddress,
    loading,
    checkout,
    maxCreditAvailable,
    walletBalance,
  } = useQuickOrder();

  const [paymentReviewOpen, setPaymentReviewOpen] = useState(false);
  const [creditManualEntry, setCreditManualEntry] = useState("0");
  const [applyCredit, setApplyCredit] = useState(true);

  useEffect(() => {
    if (!paymentReviewOpen) return;
    setApplyCredit(maxCreditAvailable > 0);
    setCreditManualEntry(maxCreditAvailable.toFixed(2));
  }, [paymentReviewOpen, maxCreditAvailable]);

  const parsedCreditInput = Number.parseFloat(creditManualEntry);
  const normalizedCredit = Number.isFinite(parsedCreditInput) ? parsedCreditInput : 0;
  const effectiveCreditAmount = applyCredit
    ? Math.min(maxCreditAvailable, Math.max(0, normalizedCredit))
    : 0;
  const remainingBalance = Math.max((priceData?.total ?? 0) - effectiveCreditAmount, 0);

  async function handlePaymentReviewConfirm() {
    if (!priceData) return;
    const preference = effectiveCreditAmount >= priceData.total
      ? "CREDIT_ONLY"
      : effectiveCreditAmount > 0
        ? "SPLIT"
        : "CARD_ONLY";
    setPaymentReviewOpen(false);
    await checkout({ creditRequestedAmount: effectiveCreditAmount, paymentPreference: preference });
  }

  if (!priceData) return null;

  return (
    <section className="rounded-lg border border-border bg-surface-overlay p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Truck className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold sm:text-lg">Delivery Details</h2>
      </div>
      <div className="space-y-4">
        {/* Delivery Summary Card */}
        <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/50 to-blue-100/30 p-4 dark:border-blue-800/40 dark:from-blue-950/20 dark:to-blue-900/10">
          {shippingQuote ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                    <Truck className="h-4 w-4" />
                    {shippingQuote.label}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Delivery cost: ${shippingQuote.amount.toFixed(2)}
                    {shippingQuote.remoteApplied && shippingQuote.remoteSurcharge
                      ? ` (incl. +$${shippingQuote.remoteSurcharge.toFixed(2)} remote area)`
                      : ""}
                  </p>
                </div>
              </div>
              {/* Show delivery address if entered */}
              {address.line1 && address.city && address.state && address.postcode && (
                <div className="border-t border-blue-200/60 pt-2.5 dark:border-blue-800/40">
                  <p className="mb-1 text-xs font-medium text-blue-900 dark:text-blue-100">
                    Delivering to:
                  </p>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    {address.name && <p className="font-medium">{address.name}</p>}
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.city}, {address.state} {address.postcode}
                    </p>
                    {address.phone && <p>Ph: {address.phone}</p>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter address below to calculate delivery cost
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={address.name}
              onChange={(e) => setAddress({ ...address, name: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Address Line 1</Label>
            <Input
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Address Line 2</Label>
            <Input
              value={address.line2}
              onChange={(e) => setAddress({ ...address, line2: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">City</Label>
              <Input
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input
                value={address.state}
                onChange={(e) =>
                  setAddress({
                    ...address,
                    state: e.target.value.toUpperCase(),
                  })
                }
                className="h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Postcode</Label>
            <Input
              value={address.postcode}
              onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
              className="h-9"
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => setPaymentReviewOpen(true)}
          disabled={!priceData || !shippingQuote || loading}
        >
          {loading ? "Processing..." : "Place Project"}
        </Button>
      </div>

      <PaymentReviewDialog
        open={paymentReviewOpen}
        onOpenChange={setPaymentReviewOpen}
        projectTotal={priceData.total}
        shipping={priceData.shipping}
        walletBalance={walletBalance}
        applyCredit={applyCredit}
        onApplyCreditChange={setApplyCredit}
        creditManualEntry={creditManualEntry}
        onCreditManualEntryChange={setCreditManualEntry}
        maxCreditAvailable={maxCreditAvailable}
        effectiveCreditAmount={effectiveCreditAmount}
        remainingBalance={remainingBalance}
        onConfirm={handlePaymentReviewConfirm}
        loading={loading}
      />
    </section>
  );
}
