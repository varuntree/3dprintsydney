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
import { getJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { FileText } from "lucide-react";
import { InlineLoader } from "@/components/ui/loader";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DataCard } from "@/components/ui/data-card";
import {
  DataList,
  DataListContent,
  DataListFooter,
  DataListHeader,
  DataListItem,
  DataListValue,
} from "@/components/ui/data-list";

export type QuoteSummaryRecord = {
  id: number;
  number: string;
  clientName: string;
  status: string;
  total: number;
  issueDate: string;
  expiryDate: string | null;
};

interface QuotesViewProps {
  initial: QuoteSummaryRecord[];
}

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Declined", value: "DECLINED" },
  { label: "Converted", value: "CONVERTED" },
];

export function QuotesView({ initial }: QuotesViewProps) {
  const { data, isFetching } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => getJson<QuoteSummaryRecord[]>("/api/quotes"),
    initialData: initial,
    staleTime: 1000 * 60,
  });

  const [tab, setTab] = useState<string>("all");

  const filtered = useMemo(() => {
    const records = data ?? [];
    if (tab === "all") return records;
    return records.filter((quote) => quote.status === tab);
  }, [data, tab]);

  const quotes = data ?? [];

  // Calculate metrics
  const totalValue = quotes.reduce((sum, quote) => sum + quote.total, 0);
  const pendingQuotes = quotes.filter(quote => quote.status === 'PENDING');
  const pendingValue = pendingQuotes.reduce((sum, quote) => sum + quote.total, 0);
  const acceptedQuotes = quotes.filter(quote => quote.status === 'ACCEPTED');
  const acceptedValue = acceptedQuotes.reduce((sum, quote) => sum + quote.total, 0);

  if (!data && isFetching) {
    return (
      <>
        <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Quotes
              </h1>
              <p className="text-sm text-muted-foreground">
                Prepare offers with consistent pricing and move accepted work into invoices.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 sm:mt-6">
            <InlineLoader label="Loading…" className="text-[10px]" />
          </div>
        </header>

        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Loading quotes…</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton columns={6} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Quotes
            </h1>
            <p className="text-sm text-muted-foreground">
              Prepare offers with consistent pricing and move accepted work into invoices.
            </p>
          </div>
          <ActionButton
            href="/quotes/new"
            className="w-full rounded-full sm:w-auto"
          >
            <FileText className="h-4 w-4" />
            <span>New Quote</span>
          </ActionButton>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 sm:mt-6">
          <span>{quotes.length} total</span>
          <span>{filtered.length} in view</span>
          {isFetching ? <InlineLoader label="Refreshing…" className="text-[10px]" /> : null}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          title="Total Quotes"
          value={quotes.length}
          tone="slate"
        />
        <DataCard
          title="Total Value"
          value={formatCurrency(totalValue)}
          tone="sky"
        />
        <DataCard
          title="Pending Value"
          value={formatCurrency(pendingValue)}
          tone={pendingValue > 0 ? "amber" : "slate"}
        />
        <DataCard
          title="Accepted Value"
          value={formatCurrency(acceptedValue)}
          tone={acceptedValue > 0 ? "emerald" : "slate"}
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
                Quote Register
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <EmptyState
                  title="No quotes in this view"
                  description="Adjust filters or create a new quote to see it here."
                  actions={
                    <ActionButton
                      href="/quotes/new"
                      className="gap-2 rounded-full"
                    >
                      <FileText className="h-4 w-4" />
                      <span>New Quote</span>
                    </ActionButton>
                  }
                  className="rounded-2xl border-border"
                />
              ) : (
                <>
                  <DataList className="md:hidden">
                    {filtered.map((quote) => (
                      <DataListItem key={quote.id}>
                        <DataListHeader>
                          <div className="space-y-1">
                            <NavigationLink
                              href={`/quotes/${quote.id}`}
                              className="text-base font-semibold text-foreground hover:underline"
                            >
                              {quote.number}
                            </NavigationLink>
                            <p className="text-sm text-muted-foreground">{quote.clientName}</p>
                          </div>
                          <StatusBadge status={quote.status} size="sm" />
                        </DataListHeader>
                        <DataListContent className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2 uppercase tracking-[0.2em]">
                            <span>Issued {formatDate(quote.issueDate)}</span>
                            <span>•</span>
                            <span>
                              Expires {quote.expiryDate ? formatDate(quote.expiryDate) : "—"}
                            </span>
                          </div>
                        </DataListContent>
                        <DataListFooter className="justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Quote total</span>
                          <DataListValue>{formatCurrency(quote.total)}</DataListValue>
                        </DataListFooter>
                      </DataListItem>
                    ))}
                  </DataList>

                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quote</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((quote) => (
                          <TableRow
                            key={quote.id}
                            className="transition-colors hover:bg-surface-elevated"
                          >
                            <TableCell>
                              <NavigationLink
                                href={`/quotes/${quote.id}`}
                                className="font-medium text-foreground hover:underline"
                              >
                                {quote.number}
                              </NavigationLink>
                            </TableCell>
                            <TableCell>{quote.clientName}</TableCell>
                            <TableCell>
                              <StatusBadge status={quote.status} size="sm" />
                            </TableCell>
                            <TableCell>{formatDate(quote.issueDate)}</TableCell>
                            <TableCell>
                              {quote.expiryDate ? formatDate(quote.expiryDate) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(quote.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
