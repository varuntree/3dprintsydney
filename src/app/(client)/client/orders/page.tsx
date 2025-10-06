"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InvoiceRow = { id: number; number: string; status: string; total: number; issueDate: string; balanceDue: number };

export default function ClientOrdersPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => { load(0, true); }, []);

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
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2"><a href={`/client/orders/${r.id}`} className="underline">{r.number}</a></td>
                <td className="px-3 py-2">{new Date(r.issueDate).toLocaleDateString()}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 text-right">{r.total.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{r.balanceDue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center">
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => { const n = page + 1; setPage(n); load(n); }}>Load more</Button>
      </div>
    </div>
  );
}
