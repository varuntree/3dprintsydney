"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getJson } from "@/lib/http";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type DashboardClientSnapshot = {
  metrics: {
    revenue30: number;
    revenue30Prev: number;
    outstandingBalance: number;
    pendingQuotes: number;
    jobsQueued: number;
    jobsPrinting: number;
  };
  revenueTrend: { month: string; value: number }[];
  quoteStatus: { status: string; count: number }[];
  jobSummary: {
    printerId: number | null;
    printerName: string;
    queued: number;
    active: number;
  }[];
  outstandingInvoices: {
    id: number;
    number: string;
    clientName: string;
    dueDate: string | null;
    balanceDue: number;
  }[];
  recentActivity: {
    id: number;
    action: string;
    message: string;
    createdAt: string;
    context: string;
  }[];
  recentActivityNextOffset: number | null;
};

const DEFAULT_RANGE = "30d" as const;

export function DashboardView({ initial }: { initial: DashboardClientSnapshot }) {
  const { data: snapshot = initial, isLoading } = useQuery({
    queryKey: ["dashboard", DEFAULT_RANGE],
    queryFn: () =>
      getJson<DashboardClientSnapshot>(
        `/api/dashboard?range=${DEFAULT_RANGE}&actLimit=0&actOffset=0`,
      ),
    initialData: initial,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const totals = useMemo(() => {
    const queued = snapshot.jobSummary.reduce((sum, entry) => sum + entry.queued, 0);
    const printing = snapshot.jobSummary.reduce((sum, entry) => sum + entry.active, 0);
    return { queued, printing };
  }, [snapshot.jobSummary]);

  return (
    <div className="space-y-6">
      <JobPipelineHeader metrics={snapshot.metrics} loading={isLoading} />
      <PrinterPipelineCard jobSummary={snapshot.jobSummary} totals={totals} loading={isLoading} />
    </div>
  );
}

function JobPipelineHeader({
  metrics,
  loading,
}: {
  metrics: DashboardClientSnapshot["metrics"];
  loading: boolean;
}) {
  const tiles = [
    {
      label: "Queued jobs",
      helper: "Jobs waiting for a printer",
      value: metrics.jobsQueued,
    },
    {
      label: "Jobs printing",
      helper: "Jobs currently on machines",
      value: metrics.jobsPrinting,
    },
    {
      label: "Jobs in flight",
      helper: "Queue plus active workloads",
      value: metrics.jobsQueued + metrics.jobsPrinting,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label} className="rounded-3xl border border-border/70 bg-card/90">
          <CardHeader className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-muted-foreground">{tile.label}</CardTitle>
            <p className="text-xs text-muted-foreground/70">{tile.helper}</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {loading ? "…" : tile.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function PrinterPipelineCard({
  jobSummary,
  totals,
  loading,
}: {
  jobSummary: DashboardClientSnapshot["jobSummary"];
  totals: { queued: number; printing: number };
  loading: boolean;
}) {
  return (
    <Card className="rounded-3xl border border-border/70 bg-card/90">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Jobs pipeline</CardTitle>
            <p className="text-xs text-muted-foreground/80">Focus the admin view on the jobs flow.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/jobs" className="text-xs font-semibold">
              Open job board
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Queued {totals.queued}</Badge>
          <Badge variant="outline">Printing {totals.printing}</Badge>
          <Badge variant="outline">{jobSummary.length} printers</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && jobSummary.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading pipeline data…</p>
        ) : jobSummary.length === 0 ? (
          <p className="text-sm text-muted-foreground">No printers are reporting workloads right now.</p>
        ) : (
          <div className="space-y-3">
            {jobSummary.map((printer) => (
              <div
                key={`${printer.printerId ?? "pool"}-${printer.printerName}`}
                className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {printer.printerName ?? "Unassigned printer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {printer.printerId ? `#${printer.printerId}` : "Queue pool"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    <span className="rounded-full bg-sky-500/10 px-3 py-0.5 text-sky-600">
                      Queue {printer.queued}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-emerald-600">
                      Printing {printer.active}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    <span>{printer.queued} jobs waiting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{printer.active} jobs printing</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
