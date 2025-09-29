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
import { getJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/table-skeleton";

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

  if (!data && isFetching) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Quotes"
          description="Prepare offers with consistent pricing and move accepted work into invoices."
        />
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">Loading quotes…</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton columns={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description="Prepare offers with consistent pricing and move accepted work into invoices."
        meta={
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
            <span>{data?.length ?? 0} total</span>
            <span>{filtered.length} in view</span>
          </div>
        }
        actions={
          <NavigationLink
            href="/quotes/new"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            New Quote
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
                Quote Register
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        No quotes in this view yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((quote) => (
                      <TableRow key={quote.id} className="hover:bg-white/80">
                        <TableCell>
                          <NavigationLink
                            href={`/quotes/${quote.id}`}
                            className="font-medium text-zinc-900 hover:underline"
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
                          {quote.expiryDate
                            ? formatDate(quote.expiryDate)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(quote.total)}
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
