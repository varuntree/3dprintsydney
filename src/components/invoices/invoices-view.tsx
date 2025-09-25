"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { getJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";

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
  const { data } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => getJson<InvoiceSummaryRecord[]>("/api/invoices"),
    initialData: initial,
    staleTime: 1000 * 60,
  });

  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "all") return data;
    return data.filter((invoice) => invoice.status === tab);
  }, [data, tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Invoices</h2>
          <p className="text-sm text-zinc-500">
            Track billing, payments, and outstanding balances for every client.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">New Invoice</Link>
        </Button>
      </div>

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
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="font-medium text-zinc-900 hover:underline"
                            >
                              {invoice.number}
                            </Link>
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
                          <Badge
                            variant="outline"
                            className="border-zinc-300/70 capitalize text-zinc-600"
                          >
                            {invoice.status.toLowerCase()}
                          </Badge>
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
