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
  const { data } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => getJson<QuoteSummaryRecord[]>("/api/quotes"),
    initialData: initial,
    staleTime: 1000 * 60,
  });

  const [tab, setTab] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "all") return data;
    return data.filter((quote) => quote.status === tab);
  }, [data, tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Quotes</h2>
          <p className="text-sm text-zinc-500">
            Prepare offers with consistent pricing and move accepted work into
            invoices.
          </p>
        </div>
        <Button asChild>
          <Link href="/quotes/new">New Quote</Link>
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
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="font-medium text-zinc-900 hover:underline"
                          >
                            {quote.number}
                          </Link>
                        </TableCell>
                        <TableCell>{quote.clientName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-zinc-300/70 capitalize text-zinc-600"
                          >
                            {quote.status.toLowerCase()}
                          </Badge>
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
