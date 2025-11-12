"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { InvoiceStatus } from "@/lib/constants/enums";
import type { ClientInvoiceDTO } from "@/lib/types/invoices";

const PAGE_SIZE = 50;

export function PrintAgainView() {
  const [invoices, setInvoices] = useState<ClientInvoiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadInvoices = useCallback(
    async (targetPage: number, replace = false) => {
      setLoading(true);
      setError(null);
      try {
        const offset = targetPage * PAGE_SIZE;
        const response = await fetch(`/api/client/invoices?limit=${PAGE_SIZE}&offset=${offset}`);
        if (!response.ok) {
          throw new Error("Failed to load past projects");
        }
        const data = (await response.json()) as ClientInvoiceDTO[] | null;
        const paidOnly = (data ?? []).filter((invoice) => invoice.status === InvoiceStatus.PAID);
        setInvoices((prev) => (replace ? paidOnly : [...prev, ...paidOnly]));
        setHasMore((data ?? []).length === PAGE_SIZE);
        setPage(targetPage);
      } catch (err) {
        console.error(err);
        setError("Unable to load past projects right now.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadInvoices(0, true);
  }, [loadInvoices]);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return invoices.filter((invoice) => {
      if (term && !invoice.number?.toLowerCase().includes(term)) {
        return false;
      }
      if (from || to) {
        const issued = new Date(invoice.issueDate);
        if (from && issued < from) return false;
        if (to && issued > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59)) {
          return false;
        }
      }
      return true;
    });
  }, [fromDate, invoices, searchTerm, toDate]);

  const handleLoadMore = () => {
    if (hasMore) {
      loadInvoices(page + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-1 sm:col-span-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by invoice number"
            aria-label="Search past projects"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/70 bg-destructive/5">
          <CardContent className="space-y-3 text-sm text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadInvoices(0, true)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">No paid projects match those criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="border-border/70 bg-card/80">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Invoice {invoice.number}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Issued {new Date(invoice.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={invoice.status} size="sm" />
              </CardHeader>
              <CardContent className="grid gap-4 border-t border-border/70 pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(invoice.total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Balance</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(invoice.balanceDue)}
                  </p>
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-3">
                  <Button asChild size="sm" variant="default">
                    <Link href={`/quick-order?reorderFrom=${invoice.id}`}>
                      Print again
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/client/orders/${invoice.id}`}>View invoice</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore ? (
            <div className="flex justify-center">
              <Button onClick={handleLoadMore} disabled={loading} size="sm" variant="outline">
                Load more history
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
