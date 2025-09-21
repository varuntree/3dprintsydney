"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { getJson } from "@/lib/http";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
};


export function DashboardView({ initial }: { initial: DashboardClientSnapshot }) {
  const [actPage, setActPage] = useState(0);
  const [range, setRange] = useState<"today" | "7d" | "30d" | "ytd">("30d");
  const actLimit = 10;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", range, actPage, actLimit] as const,
    queryFn: () =>
      getJson<DashboardClientSnapshot>(
        `/api/dashboard?range=${range}&actLimit=${actLimit}&actOffset=${actPage * actLimit}`,
      ),
    initialData: initial,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const metrics = useMemo(() => buildMetrics(data), [data]);
  const revenueSeries = data.revenueTrend.map(({ month, value }) => ({
    label: format(parseISO(`${month}-01`), "MMM"),
    value,
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h2>
          <p className="text-sm text-zinc-500">
            Monitor revenue, pipeline, queue health, and recent activity in one glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {([
            { key: "today", label: "Today" },
            { key: "7d", label: "7d" },
            { key: "30d", label: "30d" },
            { key: "ytd", label: "YTD" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                range === opt.key
                  ? "border-zinc-300 bg-white text-zinc-900 shadow-sm"
                  : "border-transparent bg-zinc-100 text-zinc-600",
              )}
              onClick={() => {
                setRange(opt.key);
                setActPage(0);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} loading={isLoading} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-500">
              Revenue — last 6 months
            </CardTitle>
            <span className="text-xs text-zinc-400">AUD</span>
          </CardHeader>
          <CardContent>
            <Sparkline data={revenueSeries} />
          </CardContent>
        </Card>
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
              Quote Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.quoteStatus.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3"
              >
                <span className="text-sm font-medium text-zinc-700">
                  {statusLabel(entry.status)}
                </span>
                <Badge variant="outline" className="border-zinc-200 text-xs text-zinc-500">
                  {entry.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
              Outstanding Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.outstandingInvoices.length === 0 ? (
              <p className="text-sm text-zinc-500">No outstanding invoices 🎉</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.outstandingInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">
                        {invoice.number}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {invoice.clientName}
                        {invoice.dueDate
                          ? ` • due ${format(parseISO(invoice.dueDate), "dd MMM")}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-zinc-800">
                      {formatCurrency(invoice.balanceDue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
              Printer Load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.jobSummary.map((summary) => (
              <div
                key={summary.printerId ?? "unassigned"}
                className="rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-700">
                    {summary.printerName}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {summary.active} printing • {summary.queued} queued
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-200/70">
                  <div
                    className="h-2 rounded-full bg-zinc-900 transition-all"
                    style={calculateBarStyle(summary)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityFeed entries={data.recentActivity} loading={isLoading} fetching={isFetching} />
          <div className="mt-3 flex items-center justify-between">
            <button
              className="text-xs text-zinc-600 hover:underline disabled:opacity-40"
              onClick={() => setActPage((p) => Math.max(p - 1, 0))}
              disabled={actPage === 0}
            >
              ← Newer
            </button>
            <span className="text-xs text-zinc-400">Page {actPage + 1}</span>
            <button
              className="text-xs text-zinc-600 hover:underline disabled:opacity-40"
              onClick={() => setActPage((p) => p + 1)}
              disabled={(data.recentActivity?.length ?? 0) < actLimit}
            >
              Older →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildMetrics(
  data: DashboardClientSnapshot,
): Array<{
  label: string;
  value: string;
  helper?: string;
  tone?: "slate" | "emerald" | "sky" | "amber";
}> {
  const delta = computeDelta(data.metrics.revenue30, data.metrics.revenue30Prev);
  return [
    {
      label: "Revenue (30d)",
      value: formatCurrency(data.metrics.revenue30),
      helper: delta,
      tone: "emerald",
    },
    {
      label: "Outstanding", 
      value: formatCurrency(data.metrics.outstandingBalance),
      helper: `${data.metrics.pendingQuotes} quotes pending`,
      tone: "slate",
    },
    {
      label: "Jobs queued",
      value: data.metrics.jobsQueued.toString(),
      helper: `${data.metrics.jobsPrinting} printing`,
      tone: "amber",
    },
    {
      label: "Quotes pending",
      value: data.metrics.pendingQuotes.toString(),
      helper: `${data.quoteStatus
        .filter((entry) => entry.status === "ACCEPTED")
        .map((entry) => entry.count)
        .at(0) ?? 0} accepted`,
      tone: "sky",
    },
  ];
}

function computeDelta(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "0% vs prev 30d" : "∞% vs prev 30d";
  }
  const diff = ((current - previous) / previous) * 100;
  const label = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}% vs prev 30d`;
  return label;
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "CONVERTED":
      return "Converted";
    case "DRAFT":
      return "Draft";
    default:
      return status.toLowerCase();
  }
}

function calculateBarStyle(entry: DashboardClientSnapshot["jobSummary"][number]) {
  const total = entry.active + entry.queued;
  if (total === 0) {
    return { width: "5%", opacity: 0.3 };
  }
  const activeRatio = entry.active / total;
  const width = Math.max(activeRatio * 100, 5);
  return { width: `${width}%` };
}

function MetricCard({
  metric,
  loading,
}: {
  metric: { label: string; value: string; helper?: string; tone?: string };
  loading: boolean;
}) {
  const toneMap: Record<string, string> = {
    slate: "border-zinc-200/70",
    emerald: "border-emerald-200/70",
    sky: "border-sky-200/70",
    amber: "border-amber-200/70",
  };

  return (
    <Card
      className={cn(
        "border bg-white/70 shadow-sm backdrop-blur",
        toneMap[metric.tone ?? "slate"],
      )}
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-500">
          {metric.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-32 rounded-lg bg-zinc-200/80" />
        ) : (
          <div className="text-3xl font-semibold tracking-tight text-zinc-900">
            {metric.value}
          </div>
        )}
        {metric.helper ? (
          <p className="mt-2 text-xs text-zinc-500">{metric.helper}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Sparkline({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((point) => point.value), 1);
  const chartWidth = 100;
  const chartHeight = 36;
  const topPadding = 2;

  const points = data.map((point, index) => {
    const x = data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth;
    const valueRatio = point.value / max;
    const y = chartHeight - valueRatio * chartHeight + topPadding;
    return { x, y };
  });

  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-xs text-zinc-400">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + topPadding * 2}`} className="h-40 w-full">
        <polyline
          fill="none"
          stroke="rgba(24,24,27,0.15)"
          strokeWidth="6"
          strokeLinejoin="round"
          points={pointString}
        />
        <polyline
          fill="none"
          stroke="rgba(24,24,27,0.85)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pointString}
        />
      </svg>
    </div>
  );
}

function RecentActivityFeed({
  entries,
  loading,
  fetching,
}: {
  entries: DashboardClientSnapshot["recentActivity"];
  loading: boolean;
  fetching?: boolean;
}) {
  if (loading && !entries?.length) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl bg-zinc-200/80" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500">No recent activity yet.</p>;
  }

  return (
    <ScrollArea className="relative max-h-[320px]">
      {fetching ? (
        <div className="pointer-events-none absolute right-2 top-2 rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-zinc-500 shadow-sm">
          Loading…
        </div>
      ) : null}
      <ol className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-800">
                {entry.message}
              </span>
              <span className="text-xs text-zinc-400">
                {format(parseISO(entry.createdAt), "dd MMM, HH:mm")}
              </span>
            </div>
            {entry.context ? (
              <p className="text-xs text-zinc-500">{entry.context}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
