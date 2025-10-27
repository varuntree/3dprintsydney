"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/currency";
import { PayOnlineButton } from "@/components/client/pay-online-button";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type InvoiceRow = {
  id: number;
  number: string;
  status: string;
  total: number;
  issueDate: string;
  balanceDue: number;
  stripeCheckoutUrl?: string | null;
  discountType?: string;
  discountValue?: number;
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
      {/* Header - Mobile optimized */}
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Your Orders</h1>
        <p className="text-sm text-muted-foreground">Invoices generated from Quick Orders and other work.</p>
      </div>

      {/* Mobile: Card View */}
      <div className="space-y-3 sm:hidden">
        {rows.map((r) => {
          const isPaid = r.status === "PAID" || r.balanceDue <= 0;
          return (
            <div
              key={r.id}
              className="rounded-xl border border-border/60 bg-surface-overlay p-4 shadow-sm shadow-black/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <Link
                    href={`/client/orders/${r.id}`}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {r.number}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={r.status} size="sm" />
              </div>

              {r.discountType === "PERCENT" && (r.discountValue ?? 0) > 0 ? (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>{(r.discountValue ?? 0).toFixed(0)}% student discount applied</span>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(r.total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Balance</p>
                  <p className={cn("font-semibold", isPaid ? "text-emerald-600" : "text-primary")}>{formatCurrency(r.balanceDue)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href={`/client/orders/${r.id}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border/70 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                >
                  View details
                </Link>
                {isPaid ? (
                  <span className="text-center text-xs font-medium text-muted-foreground">Paid in full</span>
                ) : (
                  <PayOnlineButton
                    invoiceId={r.id}
                    balanceDue={r.balanceDue}
                    walletBalance={walletBalance}
                    size="default"
                    className="w-full justify-center"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface-overlay md:block">
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
                    {r.discountType === "PERCENT" && (r.discountValue ?? 0) > 0 ? (
                      <div className="text-[11px] font-medium text-emerald-600">
                        {(r.discountValue ?? 0).toFixed(0)}% student discount
                      </div>
                    ) : null}
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

      {/* Pagination and Empty State */}
      {rows.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No orders to view</p>
        </div>
      ) : hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="default"
            onClick={() => {
              const n = page + 1;
              setPage(n);
              load(n);
            }}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
