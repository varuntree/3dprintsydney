"use client";

import { NavigationLink } from "@/components/ui/navigation-link";
import { ActionButton } from "@/components/ui/action-button";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { Receipt } from "lucide-react";
import { getJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { InlineLoader } from "@/components/ui/loader";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useStripeStatus } from "@/hooks/use-stripe-status";
import { DataCard } from "@/components/ui/data-card";
import {
  DataList,
  DataListBadge,
  DataListContent,
  DataListFooter,
  DataListHeader,
  DataListItem,
  DataListValue,
} from "@/components/ui/data-list";


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

  const stripeStatus = useStripeStatus();
  const stripeConfigured =
    stripeStatus.data?.ok === true && !stripeStatus.isError;

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
      <>
        <header className="rounded-3xl border border-border bg-surface-elevated/80 p-6 shadow-sm shadow-black/5 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Invoices
              </h1>
              <p className="text-sm text-muted-foreground">
                Track billing, payments, and outstanding balances for every client.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
            <InlineLoader label="Loading…" className="text-[10px]" />
          </div>
        </header>

        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Loading invoices…
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton columns={7} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Invoices
            </h1>
            <p className="text-sm text-muted-foreground">
              Track billing, payments, and outstanding balances for every client.
            </p>
          </div>
          <ActionButton
            href="/invoices/new"
            className="w-full rounded-full sm:w-auto"
          >
            <Receipt className="h-4 w-4" />
            <span>New Invoice</span>
          </ActionButton>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 sm:mt-6">
          <span>{totals.invoices} total</span>
          <span>{formatCurrency(totals.outstanding)} outstanding</span>
          <span>{formatCurrency(totals.billed)} billed</span>
          {isFetching ? (
            <InlineLoader label="Refreshing…" className="text-[10px]" />
          ) : null}
          {stripeStatus.isLoading ? (
            <InlineLoader
              label="Checking payments…"
              className="text-[10px]"
            />
          ) : null}
          {!stripeStatus.isLoading && !stripeConfigured ? (
            <Badge
              variant="outline"
              className="border border-border bg-warning-subtle px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-warning-foreground"
            >
              Stripe disabled
            </Badge>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          title="Total Invoices"
          value={totals.invoices}
          tone="slate"
        />
        <DataCard
          title="Total Billed"
          value={formatCurrency(totals.billed)}
          tone="sky"
        />
        <DataCard
          title="Outstanding"
          value={formatCurrency(totals.outstanding)}
          tone={totals.outstanding > 0 ? "amber" : "emerald"}
        />
        <DataCard
          title="Overdue Amount"
          value={formatCurrency(filtered.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.balanceDue, 0))}
          tone={filtered.filter(inv => inv.status === 'OVERDUE').length > 0 ? "amber" : "slate"}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          {STATUS_TABS.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {status.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="space-y-4">
          <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataList className="md:hidden">
                {filtered.length === 0 ? (
                  <EmptyState
                    title="No invoices in this view"
                    description="Adjust filters or create a new invoice to see it here."
                    className="rounded-2xl border-border"
                  />
                ) : (
                  filtered.map((invoice) => (
                    <DataListItem key={invoice.id}>
                      <DataListHeader>
                        <div className="space-y-1">
                          <NavigationLink
                            href={`/invoices/${invoice.id}`}
                            className="text-base font-semibold text-foreground hover:underline"
                          >
                            {invoice.number}
                          </NavigationLink>
                          <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            <span>Issued {formatDate(invoice.issueDate)}</span>
                            <span>•</span>
                            <span>Due {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={invoice.status} size="sm" />
                          {invoice.hasStripeLink ? (
                            <DataListBadge className="border-emerald-200/70 bg-emerald-50 text-emerald-700">
                              Stripe
                            </DataListBadge>
                          ) : null}
                        </div>
                      </DataListHeader>
                      <DataListContent className="grid grid-cols-2 gap-3 text-left text-xs text-muted-foreground">
                        <div>
                          <p className="uppercase tracking-[0.2em]">Total</p>
                          <DataListValue>{formatCurrency(invoice.total)}</DataListValue>
                        </div>
                        <div className="text-right">
                          <p className="uppercase tracking-[0.2em]">Balance</p>
                          <DataListValue>{formatCurrency(invoice.balanceDue)}</DataListValue>
                        </div>
                      </DataListContent>
                      <DataListFooter className="justify-end">
                        <NavigationLink
                          href={`/invoices/${invoice.id}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          View invoice
                        </NavigationLink>
                      </DataListFooter>
                    </DataListItem>
                  ))
                )}
              </DataList>

              <div className="hidden overflow-x-auto md:block">
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
                        <TableCell colSpan={7} className="p-0">
                          <EmptyState
                            title="No invoices in this view"
                            description="Adjust filters or create a new invoice to see it here."
                            className="rounded-2xl border-border"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="transition-colors hover:bg-surface-elevated"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <NavigationLink
                                href={`/invoices/${invoice.id}`}
                                className="font-medium text-foreground hover:underline"
                              >
                                {invoice.number}
                              </NavigationLink>
                              {invoice.hasStripeLink ? (
                                <Badge
                                  variant="outline"
                                  className="px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] border-emerald-200/70 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-900/20 dark:text-emerald-300"
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
