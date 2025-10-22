"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

import { formatCurrency } from "@/lib/currency";
import { getJson } from "@/lib/http";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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


export function DashboardView({ initial }: { initial: DashboardClientSnapshot }) {
  const defaultRange = "30d" as const;
  const [range, setRange] = useState<"today" | "7d" | "30d" | "ytd">(defaultRange);
  const actLimit = 10;
  const queryClient = useQueryClient();

  const { data: snapshot = initial, isLoading } = useQuery({
    queryKey: ["dashboard", range] as const,
    queryFn: () =>
      getJson<DashboardClientSnapshot>(
        `/api/dashboard?range=${range}&actLimit=${actLimit}&actOffset=0`,
      ),
    initialData: range === defaultRange ? initial : undefined,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  type ActivityPage = {
    items: DashboardClientSnapshot["recentActivity"];
    nextOffset: number | null;
  };

  const {
    data: activityData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: activityLoading,
    isFetching: activityFetching,
  } = useInfiniteQuery<ActivityPage>({
    queryKey: ["dashboard", "activity", range, actLimit] as const,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getJson<ActivityPage>(
        `/api/dashboard/activity?limit=${actLimit}&offset=${pageParam}`,
      ),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialData:
      range === defaultRange
        ? {
            pages: [
              {
                items: initial.recentActivity,
                nextOffset:
                  initial.recentActivityNextOffset ??
                  (initial.recentActivity.length >= actLimit
                    ? actLimit
                    : null),
              },
            ],
            pageParams: [0],
          }
        : undefined,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!snapshot) return;
    const nextOffset =
      snapshot.recentActivityNextOffset ??
      (snapshot.recentActivity.length >= actLimit
        ? actLimit
        : null);

    queryClient.setQueryData<InfiniteData<ActivityPage>>(
      ["dashboard", "activity", range, actLimit],
      (current) => {
        const replacementPage: ActivityPage = {
          items: snapshot.recentActivity,
          nextOffset,
        };

        if (!current || current.pages.length === 0) {
          return { pageParams: [0], pages: [replacementPage] };
        }

        const firstPage = current.pages[0];
        const matchesExisting =
          firstPage.items.length === replacementPage.items.length &&
          firstPage.items.every((entry, index) => entry.id === replacementPage.items[index]?.id);

        if (matchesExisting) {
          return current;
        }

        const remainingPages = current.pages.slice(1);
        const remainingParams = current.pageParams.slice(1);

        return {
          pageParams: [0, ...remainingParams],
          pages: [replacementPage, ...remainingPages],
        };
      },
    );
  }, [snapshot, queryClient, range, actLimit]);

  const activityEntries = activityData?.pages.flatMap((page) => page.items) ?? snapshot.recentActivity ?? [];

  const metrics = useMemo(() => buildMetrics(snapshot), [snapshot]);
  const revenueSeries = snapshot.revenueTrend.map(({ month, value }) => ({
    label: format(parseISO(`${month}-01`), "MMM"),
    value,
  }));
  const rangeOptions = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "ytd", label: "Year" },
  ] as const;

  return (
    <div className="flex flex-col gap-10">
      <DashboardHeader
        range={range}
        onRangeChange={setRange}
        options={rangeOptions}
        revenue={snapshot.metrics.revenue30}
        outstanding={snapshot.metrics.outstandingBalance}
        queuedJobs={snapshot.metrics.jobsQueued}
      />

      <ExecutiveOverview metrics={metrics} loading={isLoading} />

      <Separator decorative className="bg-border/60" />

      <PerformanceSection
        revenueSeries={revenueSeries}
        quoteStatus={snapshot.quoteStatus}
      />

      <Separator decorative className="bg-border/60" />

      <OperationsSection
        invoices={snapshot.outstandingInvoices}
        jobSummary={snapshot.jobSummary}
      />

      <Separator decorative className="bg-border/60" />

      <ActivitySection
        entries={activityEntries}
        loading={activityEntries.length === 0 && (isLoading || activityLoading)}
        fetching={activityFetching && !isFetchingNextPage}
        hasMore={Boolean(hasNextPage)}
        onLoadMore={hasNextPage ? () => fetchNextPage() : undefined}
        fetchingMore={isFetchingNextPage}
      />
    </div>
  );
}

type MetricDatum = {
  label: string;
  value: string;
  helper?: string;
  tone?: "slate" | "emerald" | "sky" | "amber";
};

type RangeKey = "today" | "7d" | "30d" | "ytd";
type RangeOption = { key: RangeKey; label: string };

function buildMetrics(data: DashboardClientSnapshot): MetricDatum[] {
  const percentDelta = computeDelta(data.metrics.revenue30, data.metrics.revenue30Prev);
  const revenueDeltaValue = data.metrics.revenue30 - data.metrics.revenue30Prev;
  const revenueDeltaDisplay =
    revenueDeltaValue === 0
      ? formatCurrency(0)
      : `${revenueDeltaValue > 0 ? "+" : "-"}${formatCurrency(Math.abs(revenueDeltaValue))}`;

  const now = new Date();
  const overdueInvoices = data.outstandingInvoices.filter((invoice) => {
    if (!invoice.dueDate) return false;
    const due = parseISO(invoice.dueDate);
    return due < now;
  }).length;
  const outstandingCount = data.outstandingInvoices.length;

  return [
    {
      label: "Revenue change",
      value: revenueDeltaDisplay,
      helper: percentDelta,
      tone: revenueDeltaValue >= 0 ? "emerald" : "slate",
    },
    {
      label: "Invoices overdue",
      value: overdueInvoices.toString(),
      helper: `${outstandingCount} open`,
      tone: overdueInvoices > 0 ? "amber" : "emerald",
    },
    {
      label: "Jobs printing",
      value: data.metrics.jobsPrinting.toString(),
      helper: `${data.metrics.jobsQueued} queued`,
      tone: "slate",
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

function DashboardHeader({
  range,
  onRangeChange,
  options,
  revenue,
  outstanding,
  queuedJobs,
}: {
  range: RangeKey;
  onRangeChange: (next: RangeKey) => void;
  options: readonly RangeOption[];
  revenue: number;
  outstanding: number;
  queuedJobs: number;
}) {
  return (
    <header className="rounded-2xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:rounded-3xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Daily Console
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Real-time health of cashflow, production, and customer movement.
          </p>
        </div>
        <RangeToggle range={range} options={options} onChange={onRangeChange} />
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:mt-6 sm:grid-cols-3">
        <HeaderStat label="Revenue (range)" value={formatCurrency(revenue)} tone="emerald" />
        <HeaderStat label="Outstanding balance" value={formatCurrency(outstanding)} tone="slate" />
        <HeaderStat label="Jobs queued" value={`${queuedJobs}`} tone="amber" />
      </div>
    </header>
  );
}

function RangeToggle({
  range,
  options,
  onChange,
}: {
  range: RangeKey;
  options: readonly RangeOption[];
  onChange: (value: RangeKey) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1 text-xs font-medium shadow-inner shadow-black/5">
      {options.map((option) => {
        const active = range === option.key;
        return (
          <button
            key={option.key}
            type="button"
            className={cn(
              "rounded-full px-3 py-1 transition",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function HeaderStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "slate";
}) {
  const palette: Record<typeof tone, { value: string; border: string }> = {
    emerald: {
      value: "text-emerald-600",
      border: "border-emerald-200/80",
    },
    amber: {
      value: "text-amber-600",
      border: "border-amber-200/80",
    },
    slate: {
      value: "text-foreground",
      border: "border-border/60",
    },
  };

  return (
    <div className={cn("rounded-2xl border bg-card/80 p-4 shadow-sm shadow-black/5", palette[tone].border)}>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 text-lg font-semibold", palette[tone].value)}>{value}</p>
    </div>
  );
}

function ExecutiveOverview({
  metrics,
  loading,
}: {
  metrics: MetricDatum[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm shadow-black/5"
          >
            <Skeleton className="h-16 w-24 rounded-2xl" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <ExecutiveTile key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

const metricToneStyles: Record<string, { border: string; pill: string; gradient: string; value: string }> = {
  emerald: {
    border: "border-emerald-200/70",
    pill: "bg-emerald-500/10 text-emerald-700",
    gradient: "from-emerald-500/10 via-emerald-400/5 to-transparent",
    value: "text-emerald-700",
  },
  sky: {
    border: "border-sky-200/70",
    pill: "bg-sky-500/10 text-sky-700",
    gradient: "from-sky-500/10 via-sky-400/5 to-transparent",
    value: "text-sky-700",
  },
  amber: {
    border: "border-amber-200/70",
    pill: "bg-amber-500/10 text-amber-800",
    gradient: "from-amber-500/10 via-amber-400/5 to-transparent",
    value: "text-amber-800",
  },
  slate: {
    border: "border-border/60",
    pill: "bg-muted text-muted-foreground",
    gradient: "from-muted via-muted/60 to-transparent",
    value: "text-foreground",
  },
};

function ExecutiveTile({ metric }: { metric: MetricDatum }) {
  const tone = metricToneStyles[metric.tone ?? "slate"];
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border bg-card/90 p-6 shadow-sm shadow-black/5 transition-colors duration-200", tone.border)}>
      <span
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          "bg-gradient-to-br",
          tone.gradient,
        )}
        aria-hidden
      />
      <div className="relative flex flex-col gap-4">
        <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-medium", tone.pill)}>
          {metric.label}
        </span>
        <div className={cn("text-3xl font-semibold tracking-tight", tone.value)}>
          {metric.value}
        </div>
        {metric.helper ? (
          <p className="text-sm text-muted-foreground">{metric.helper}</p>
        ) : null}
      </div>
    </div>
  );
}

function PerformanceSection({
  revenueSeries,
  quoteStatus,
}: {
  revenueSeries: { label: string; value: number }[];
  quoteStatus: DashboardClientSnapshot["quoteStatus"];
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <RevenueCard data={revenueSeries} />
      <QuotePipelineCard quoteStatus={quoteStatus} />
    </section>
  );
}

function RevenueCard({ data }: { data: { label: string; value: number }[] }) {
  const latest = data.at(-1)?.value ?? 0;
  const peak = data.reduce((max, point) => Math.max(max, point.value), 0);

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm shadow-black/5">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Revenue — last 6 months
          </CardTitle>
          <p className="text-xs text-muted-foreground/80">
            Track monthly cash intake and peaks.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full border-border/60 px-3 py-1 text-[11px] text-muted-foreground">
          AUD
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Current month
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatCurrency(latest)}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Peak {formatCurrency(peak)}</p>
          </div>
        </div>
        <Sparkline data={data} />
      </CardContent>
    </Card>
  );
}

function QuotePipelineCard({
  quoteStatus,
}: {
  quoteStatus: DashboardClientSnapshot["quoteStatus"];
}) {
  const pipeline = [
    { key: "PENDING", tone: "bg-sky-500", label: "Pending" },
    { key: "ACCEPTED", tone: "bg-emerald-500", label: "Accepted" },
    { key: "CONVERTED", tone: "bg-purple-500", label: "Converted" },
    { key: "DECLINED", tone: "bg-rose-500", label: "Declined" },
    { key: "DRAFT", tone: "bg-slate-400", label: "Draft" },
  ] as const;

  const totals = pipeline.map((stage) => ({
    ...stage,
    count: quoteStatus.find((entry) => entry.status === stage.key)?.count ?? 0,
  }));
  const aggregate = totals.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm shadow-black/5">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          Quote pipeline
        </CardTitle>
        <p className="text-xs text-muted-foreground/80">
          {aggregate} active quotes across the pipeline.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {aggregate === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pipeline is clear. Create a new quote to see activity here.
          </p>
        ) : (
          totals.map((stage) => {
            const percentage = aggregate === 0 ? 0 : (stage.count / aggregate) * 100;
            return (
              <div
                key={stage.key}
                className="rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm shadow-black/5"
              >
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{stage.label}</span>
                  <span>{stage.count}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full transition-all", stage.tone)}
                    style={{ width: `${Math.max(percentage, 3)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function OperationsSection({
  invoices,
  jobSummary,
}: {
  invoices: DashboardClientSnapshot["outstandingInvoices"];
  jobSummary: DashboardClientSnapshot["jobSummary"];
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <OutstandingInvoicesCard invoices={invoices} />
      <PrinterLoadCard jobSummary={jobSummary} />
    </section>
  );
}

function OutstandingInvoicesCard({
  invoices,
}: {
  invoices: DashboardClientSnapshot["outstandingInvoices"];
}) {
  const topInvoices = invoices.slice(0, 4);
  const now = new Date();

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm shadow-black/5">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          Outstanding invoices
        </CardTitle>
        <p className="text-xs text-muted-foreground/80">
          {invoices.length === 0
            ? "All invoices paid."
            : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} awaiting payment.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {topInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing outstanding right now 🎉</p>
        ) : (
          topInvoices.map((invoice) => {
            const due = invoice.dueDate ? parseISO(invoice.dueDate) : null;
            const overdue = due ? due < now : false;
            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm shadow-black/5"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {invoice.number}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {invoice.clientName}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className={cn("font-medium", overdue && "text-rose-600")}>{formatCurrency(invoice.balanceDue)}</p>
                  <p>{due ? format(due, "dd MMM") : "No due date"}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function PrinterLoadCard({
  jobSummary,
}: {
  jobSummary: DashboardClientSnapshot["jobSummary"];
}) {
  if (jobSummary.length === 0) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm shadow-black/5">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Printer load
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No printers configured yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm shadow-black/5">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          Printer load
        </CardTitle>
        <p className="text-xs text-muted-foreground/80">
          Live utilisation of each printer with queued jobs.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobSummary.map((summary) => {
          const total = summary.active + summary.queued;
          const activeRatio = total === 0 ? 0 : summary.active / total;
          return (
            <div
              key={summary.printerId ?? "unassigned"}
              className="rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm shadow-black/5"
            >
              <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                <span>{summary.printerName}</span>
                <span className="text-xs text-muted-foreground font-medium">
                  {summary.active} running · {summary.queued} queued
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(activeRatio * 100, 5)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ActivitySection({
  entries,
  loading,
  fetching,
  hasMore,
  onLoadMore,
  fetchingMore,
}: {
  entries: DashboardClientSnapshot["recentActivity"];
  loading: boolean;
  fetching?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  fetchingMore?: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-muted-foreground">Recent activity</h2>
          <p className="text-sm text-muted-foreground/80">
            Latest decisions, payments, and workflow changes across the app.
          </p>
        </div>
      </div>
      <ActivityTimeline
        entries={entries}
        loading={loading}
        fetching={fetching}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        fetchingMore={fetchingMore}
      />
    </section>
  );
}

function ActivityTimeline({
  entries,
  loading,
  fetching,
  hasMore,
  onLoadMore,
  fetchingMore,
}: {
  entries: DashboardClientSnapshot["recentActivity"];
  loading: boolean;
  fetching?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  fetchingMore?: boolean;
}) {
  if (loading && !entries?.length) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        {fetching ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
            Updating…
          </div>
        ) : null}
        <ScrollArea className="h-96 pr-1">
          <Timeline entries={entries} />
        </ScrollArea>
      </div>
      {hasMore && onLoadMore ? (
        <LoadingButton
          variant="outline"
          size="sm"
          className="self-center"
          onClick={onLoadMore}
          loading={fetchingMore}
          loadingText="Loading…"
        >
          Load older activity
        </LoadingButton>
      ) : null}
    </div>
  );
}

function Sparkline({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No revenue recorded yet.</p>;
  }

  const max = Math.max(...data.map((point) => point.value), 1);
  const chartWidth = 120;
  const chartHeight = 42;
  const topPadding = 4;

  const points = data.map((point, index) => {
    const x = data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth;
    const valueRatio = point.value / max;
    const y = chartHeight - valueRatio * chartHeight + topPadding;
    return { x, y };
  });

  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-xs text-muted-foreground/80">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + topPadding * 2}`} className="h-36 w-full">
        <polyline
          fill="none"
          stroke="rgba(24,24,27,0.08)"
          strokeWidth="6"
          strokeLinejoin="round"
          points={pointString}
        />
        <polyline
          fill="none"
          stroke="rgba(16, 185, 129, 0.85)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pointString}
        />
      </svg>
    </div>
  );
}

function Timeline({
  entries,
}: {
  entries: DashboardClientSnapshot["recentActivity"];
}) {
  return (
    <ol className="relative flex flex-col gap-6 pl-8 overflow-x-hidden">
      <span className="bg-border/70 pointer-events-none absolute left-4 top-1 h-[calc(100%-1rem)] w-px" />
      {entries.map((entry, index) => {
        const accent = activityAccent(entry.action, index);
        return (
          <li key={entry.id} className="relative pl-2">
            <span
              className={cn(
                "absolute left-3 top-1.5 h-2.5 w-2.5 rounded-full ring-4",
                accent.dot,
              )}
            />
            <article className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm shadow-black/5">
              <header className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("uppercase tracking-wide", accent.badge)}>
                  {formatActionLabel(entry.action)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(entry.createdAt), "dd MMM, HH:mm")}
                </span>
              </header>
              <p className="line-clamp-2 text-sm font-medium text-foreground">
                {entry.message}
              </p>
              {entry.context ? (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {entry.context}
                </p>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

function activityAccent(action: string, index: number) {
  const catalog: Record<string, { dot: string; badge: string }> = {
    quote: {
      dot: "bg-sky-500 ring-sky-100/80",
      badge: "border-sky-200/70 text-sky-800",
    },
    invoice: {
      dot: "bg-emerald-500 ring-emerald-100/80",
      badge: "border-emerald-200/70 text-emerald-800",
    },
    payment: {
      dot: "bg-amber-500 ring-amber-100/80",
      badge: "border-amber-200/70 text-amber-900",
    },
    material: {
      dot: "bg-rose-500 ring-rose-100/80",
      badge: "border-rose-200/70 text-rose-800",
    },
    job: {
      dot: "bg-purple-500 ring-purple-100/80",
      badge: "border-purple-200/70 text-purple-800",
    },
    client: {
      dot: "bg-slate-500 ring-slate-100/80",
      badge: "border-slate-200/70 text-slate-800",
    },
  };

  const key = Object.keys(catalog).find((token) =>
    action.toLowerCase().includes(token),
  );

  if (key) {
    return catalog[key];
  }

  const fallbackPalette = [
    "bg-accent-strong ring-accent-soft",
    "bg-zinc-900 ring-zinc-200/70",
  ];

  return {
    dot: fallbackPalette[index % fallbackPalette.length],
    badge: "border-border text-foreground",
  };
}

function formatActionLabel(action: string) {
  if (!action) return "Activity";
  return action
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^.{1}/, (char) => char.toUpperCase());
}
