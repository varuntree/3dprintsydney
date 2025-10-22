"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/currency";
import { PayOnlineButton } from "@/components/client/pay-online-button";

type InvoiceRow = {
  id: number;
  number: string;
  status: string;
  total: number;
  issueDate: string;
  balanceDue: number;
  stripeCheckoutUrl?: string | null;
};

export default function ClientOrdersPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    load(0, true);
    loadWalletBalance();
  }, []);

  async function loadWalletBalance() {
    try {
      const res = await fetch("/api/client/dashboard");
      if (res.ok) {
        const { data } = await res.json();
        setWalletBalance(data.walletBalance ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
    }
  }

  async function load(p: number, replace = false) {
    const limit = 20; const offset = p * limit;
    const r = await fetch(`/api/client/invoices?limit=${limit}&offset=${offset}`);
    if (!r.ok) return;
    const { data } = await r.json();
    setHasMore((data as InvoiceRow[]).length === limit);
    if (replace) setRows(data);
    else setRows((prev) => [...prev, ...data]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Your Orders</h1>
        <p className="text-sm text-muted-foreground">Invoices generated from Quick Orders and other work.</p>
      </div>
      <div className="rounded-lg border border-border bg-surface-overlay">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left">Number</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isPaid = r.status === "PAID" || r.balanceDue <= 0;
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <a href={`/client/orders/${r.id}`} className="underline">
                      {r.number}
                    </a>
                  </td>
                  <td className="px-3 py-2">{new Date(r.issueDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.total)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.balanceDue)}</td>
                  <td className="px-3 py-2 text-right">
                    {isPaid ? (
                      <span className="text-xs font-medium text-muted-foreground">Paid</span>
                    ) : (
                      <PayOnlineButton
                        invoiceId={r.id}
                        balanceDue={r.balanceDue}
                        walletBalance={walletBalance}
                        size="sm"
                        className="justify-end"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore}
          onClick={() => {
            const n = page + 1;
            setPage(n);
            load(n);
          }}
        >
          Load more
        </Button>
      </div>
    </div>
  );
}
