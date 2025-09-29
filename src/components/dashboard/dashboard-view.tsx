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
import { PageHeader } from "@/components/ui/page-header";
import { ActionRail } from "@/components/ui/action-rail";

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
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
    { key: "ytd", label: "YTD" },
  ] as const;

  const metricMeta = (
    <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
      <span>{formatCurrency(snapshot.metrics.revenue30)} last 30d</span>
      <span>{formatCurrency(snapshot.metrics.outstandingBalance)} outstanding</span>
      <span>{snapshot.metrics.jobsQueued} jobs queued</span>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Monitor revenue, pipeline, queue health, and recent activity in one glance."
        meta={metricMeta}
        actions={
          <ActionRail align="end" wrap={false}>
            {rangeOptions.map((opt) => (
              <button
                key={opt.key}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition",
                  range === opt.key
                    ? "border-accent-strong/20 bg-accent-soft text-foreground shadow-sm"
                    : "border-transparent bg-surface-subtle text-muted-foreground hover:border-muted hover:bg-white",
                )}
                onClick={() => setRange(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </ActionRail>
        }
      />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} loading={isLoading} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border border-border bg-card/80 shadow-sm shadow-black/5 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Revenue — last 6 months
            </CardTitle>
            <span className="text-xs text-zinc-400">AUD</span>
          </CardHeader>
          <CardContent>
            <Sparkline data={revenueSeries} />
          </CardContent>
        </Card>
        <Card className="border border-border bg-card/80 shadow-sm shadow-black/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Quote Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.quoteStatus.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm shadow-black/5"
              >
                <span className="text-sm font-medium text-foreground">
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
        <Card className="border border-border bg-card/80 shadow-sm shadow-black/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Outstanding Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.outstandingInvoices.length === 0 ? (
              <p className="text-sm text-zinc-500">No outstanding invoices 🎉</p>
            ) : (
              <div className="flex flex-col gap-3">
                {snapshot.outstandingInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm shadow-black/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {invoice.number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.clientName}
                        {invoice.dueDate
                          ? ` • due ${format(parseISO(invoice.dueDate), "dd MMM")}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(invoice.balanceDue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border border-border bg-card/80 shadow-sm shadow-black/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Printer Load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.jobSummary.map((summary) => (
              <div
                key={summary.printerId ?? "unassigned"}
                className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm shadow-black/5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {summary.printerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
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

      <Card className="border border-border bg-card/80 shadow-sm shadow-black/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityFeed
            entries={activityEntries}
            loading={activityEntries.length === 0 && (isLoading || activityLoading)}
            fetching={activityFetching && !isFetchingNextPage}
            hasMore={Boolean(hasNextPage)}
            onLoadMore={hasNextPage ? () => fetchNextPage() : undefined}
            fetchingMore={isFetchingNextPage}
          />
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

function Timeline({
  entries,
}: {
  entries: DashboardClientSnapshot["recentActivity"];
}) {
  return (
    <ol className="relative flex flex-col gap-6 pl-6">
      <span className="bg-border/70 pointer-events-none absolute left-[9px] top-1 h-[calc(100%-1rem)] w-px" />
      {entries.map((entry, index) => {
        const accent = activityAccent(entry.action, index);
        return (
          <li key={entry.id} className="relative pl-2">
            <span
              className={cn(
                "absolute left-[-19px] top-1.5 h-2.5 w-2.5 rounded-full ring-4",
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
