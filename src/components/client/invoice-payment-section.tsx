"use client";

import { useEffect, useState } from "react";
import { PayOnlineButton } from "@/components/client/pay-online-button";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { browserLogger } from "@/lib/logging/browser-logger";

interface InvoicePaymentSectionProps {
  invoiceId: number;
  balanceDue: number;
}

type DashboardStats = {
  walletBalance: number;
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  totalSpent: number;
};

export function InvoicePaymentSection({ invoiceId, balanceDue }: InvoicePaymentSectionProps) {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWalletBalance() {
      try {
        const res = await fetch("/api/client/dashboard");
        if (res.ok) {
          const { data } = await res.json() as { data: DashboardStats };
          setWalletBalance(data.walletBalance ?? 0);
        }
      } catch (error) {
        browserLogger.error({
          scope: "browser.client.invoice-payment",
          message: "Failed to fetch wallet balance",
          error,
        });
        setWalletBalance(0);
      } finally {
        setLoading(false);
      }
    }
    void fetchWalletBalance();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-end">
        <div className="text-sm text-muted-foreground">Loading payment options...</div>
      </div>
    );
  }

  const hasCredit = (walletBalance ?? 0) > 0;

  return (
    <div className="space-y-3">
      {hasCredit ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Wallet className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">Available credit:</span>
          <span className="font-semibold text-green-700 dark:text-green-400">
            {formatCurrency(walletBalance ?? 0)}
          </span>
        </div>
      ) : null}
      <div className="flex justify-end">
        <PayOnlineButton
          invoiceId={invoiceId}
          balanceDue={balanceDue}
          walletBalance={walletBalance ?? 0}
          size="sm"
        />
      </div>
    </div>
  );
}
