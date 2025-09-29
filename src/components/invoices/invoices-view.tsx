"use client";

import { NavigationLink } from "@/components/ui/navigation-link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { getJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export type InvoiceSummaryRecord = {
  id: number;
  number: string;
  clientName: string;
  status: string;
  total: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string | null;
  hasStripeLink: boolean;
};

interface InvoicesViewProps {
  initial: InvoiceSummaryRecord[];
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

export function InvoicesView({ initial }: InvoicesViewProps) {
  const { data, isFetching } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => getJson<InvoiceSummaryRecord[]>("/api/invoices"),
    initialData: initial,
    staleTime: 1000 * 60,
  });

  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const records = data ?? [];
    if (tab === "all") return records;
    return records.filter((invoice) => invoice.status === tab);
  }, [data, tab]);

  const totals = useMemo(() => {
    const source = data ?? [];
    return {
      invoices: source.length,
      outstanding: source.reduce((sum, invoice) => sum + invoice.balanceDue, 0),
      billed: source.reduce((sum, invoice) => sum + invoice.total, 0),
    };
  }, [data]);

  if (!data && isFetching) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Invoices"
          description="Track billing, payments, and outstanding balances for every client."
        />
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">Loading invoices…</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton columns={7} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Track billing, payments, and outstanding balances for every client."
        meta={
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
            <span>{totals.invoices} total</span>
            <span>{formatCurrency(totals.outstanding)} outstanding</span>
            <span>{formatCurrency(totals.billed)} billed</span>
          </div>
        }
        actions={
          <NavigationLink
            href="/invoices/new"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            New Invoice
          </NavigationLink>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-white/80 backdrop-blur">
          {STATUS_TABS.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {status.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="space-y-4">
          <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-zinc-500">
                Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        No invoices in this view.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-white/80">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <NavigationLink
                              href={`/invoices/${invoice.id}`}
                              className="font-medium text-zinc-900 hover:underline"
                            >
                              {invoice.number}
                            </NavigationLink>
                            {invoice.hasStripeLink ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200/70 bg-emerald-50 text-xs uppercase tracking-wide text-emerald-700"
                              >
                                Stripe
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} size="sm" />
                        </TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>
                          {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.balanceDue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
