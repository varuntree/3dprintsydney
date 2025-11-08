"use client";

import { useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { getUserMessage } from "@/lib/errors/user-messages";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";
import { DataCard } from "@/components/ui/data-card";
import { cn } from "@/lib/utils";

type ExportKind = "invoices" | "payments" | "jobs" | "ar-aging" | "material-usage" | "printer-utilization";

export default function ReportsPage() {
  const defaultRange = useMemo<DateRange>(() => {
    const to = new Date();
    const from = subDays(to, 29);
    return { from, to };
  }, []);

  const [range, setRange] = useState<DateRange | undefined>(defaultRange);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [quickRange, setQuickRange] = useState<"today" | "7d" | "30d" | "ytd">("30d");

  async function handleDownload(kind: ExportKind) {
    try {
      setBusy(kind);
      const params = new URLSearchParams();
      if (range?.from) params.set("from", format(range.from, "yyyy-MM-dd"));
      if (range?.to) params.set("to", format(range.to, "yyyy-MM-dd"));
      const response = await fetch(`/api/export/${kind}?${params.toString()}`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`Failed to export ${kind}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = extractFilename(disposition) ?? `${kind}-${Date.now()}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${kind} CSV`);
    } catch (error) {
      toast.error(getUserMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function handleQuickRangeChange(newRange: "today" | "7d" | "30d" | "ytd") {
    setQuickRange(newRange);
    const to = new Date();
    let from: Date;

    switch (newRange) {
      case "today":
        from = to;
        break;
      case "7d":
        from = subDays(to, 6);
        break;
      case "30d":
        from = subDays(to, 29);
        break;
      case "ytd":
        from = new Date(to.getFullYear(), 0, 1);
        break;
    }

    setRange({ from, to });
  }

  const dateSummary = range?.from
    ? `${format(range.from, "dd MMM yyyy")} → ${format(range?.to ?? range.from, "dd MMM yyyy")}`
    : "All time";

  const rangeOptions = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "ytd", label: "Year" },
  ] as const;

  return (
    <div className="flex flex-col gap-10">
      <ReportsHeader
        quickRange={quickRange}
        onQuickRangeChange={handleQuickRangeChange}
        options={rangeOptions}
        dateSummary={dateSummary}
        busy={busy}
      />

      <ExportMetricsOverview
        totalExports={6}
        dateRange={dateSummary}
        isExporting={Boolean(busy)}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
        <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm shadow-black/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Select Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={range}
              onSelect={(next) => {
                setRange(next ? normalizeRange(next) : undefined);
              }}
              numberOfMonths={1}
              className="rounded-2xl border border-border/60 bg-card/80"
            />
            <Button
              variant="ghost"
              className="mt-4 rounded-full text-xs text-muted-foreground"
              onClick={() => setRange(defaultRange)}
            >
              Reset to last 30 days
            </Button>
            <div className="mt-4 sm:hidden">
              <RangeToggle
                range={quickRange}
                options={rangeOptions}
                onChange={handleQuickRangeChange}
                className="w-full overflow-x-auto"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm shadow-black/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Available Exports
            </CardTitle>
            <p className="text-xs text-muted-foreground/80">
              Download data exports in CSV format for the selected date range.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExportRow
              title="Invoices CSV"
              description="Invoices within the selected range."
              loading={busy === "invoices"}
              onDownload={() => handleDownload("invoices")}
            />
            <ExportRow
              title="Payments CSV"
              description="Payments received within the selected range."
              loading={busy === "payments"}
              onDownload={() => handleDownload("payments")}
            />
            <ExportRow
              title="Jobs CSV"
              description="Print jobs created within the selected range."
              loading={busy === "jobs"}
              onDownload={() => handleDownload("jobs")}
            />
            <ExportRow
              title="AR Aging CSV"
              description="Outstanding invoices grouped by aging buckets."
              loading={busy === "ar-aging"}
              onDownload={() => handleDownload("ar-aging")}
            />
            <ExportRow
              title="Material Usage CSV"
              description="Sum of invoice item totals grouped by material."
              loading={busy === "material-usage"}
              onDownload={() => handleDownload("material-usage")}
            />
            <ExportRow
              title="Printer Utilization CSV"
              description="Completed jobs and hours per printer."
              loading={busy === "printer-utilization"}
              onDownload={() => handleDownload("printer-utilization")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type RangeKey = "today" | "7d" | "30d" | "ytd";
type RangeOption = { key: RangeKey; label: string };

function ExportMetricsOverview({
  totalExports,
  dateRange,
  isExporting,
  loading = false,
}: {
  totalExports: number;
  dateRange: string;
  isExporting: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm shadow-black/5"
          >
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-20 bg-muted rounded"></div>
              <div className="h-8 w-16 bg-muted rounded"></div>
              <div className="h-3 w-32 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DataCard
        title="Export Types"
        value={totalExports.toString()}
        description="Different data exports available"
        tone="sky"
      />
      <DataCard
        title="Date Range"
        value={dateRange.split(' → ')[0]?.split(' ').slice(0, 2).join(' ') || "All time"}
        description={dateRange.includes('→') ? `to ${dateRange.split(' → ')[1]?.split(' ').slice(0, 2).join(' ')}` : "Full historical data"}
        tone="slate"
      />
      <DataCard
        title="Export Status"
        value={isExporting ? "Processing" : "Ready"}
        description={isExporting ? "Export in progress..." : "Ready to export data"}
        tone={isExporting ? "amber" : "emerald"}
      />
      <DataCard
        title="File Format"
        value="CSV"
        description="Comma-separated values format"
        tone="slate"
      />
    </section>
  );
}

function ReportsHeader({
  quickRange,
  onQuickRangeChange,
  options,
  dateSummary,
  busy,
}: {
  quickRange: RangeKey;
  onQuickRangeChange: (next: RangeKey) => void;
  options: readonly RangeOption[];
  dateSummary: string;
  busy: ExportKind | null;
}) {
  return (
    <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Reports & Exports
          </h1>
          <p className="text-sm text-muted-foreground">
            Export invoices, payments, jobs, and utilization metrics for deeper analysis.
          </p>
        </div>
        <div className="hidden sm:block">
          <RangeToggle range={quickRange} options={options} onChange={onQuickRangeChange} />
        </div>
      </div>
      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <HeaderStat label="Date Range" value={dateSummary} tone="slate" />
        <HeaderStat
          label="Export Status"
          value={busy ? "Exporting..." : "Ready"}
          tone={busy ? "amber" : "emerald"}
        />
        <HeaderStat label="Available Exports" value="6 types" tone="sky" />
      </div>
      {busy ? (
        <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
          <InlineLoader label={`${busy} export…`} className="text-[10px]" />
        </div>
      ) : null}
    </header>
  );
}

function RangeToggle({
  range,
  options,
  onChange,
  className,
}: {
  range: RangeKey;
  options: readonly RangeOption[];
  onChange: (value: RangeKey) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1 text-xs font-medium shadow-inner shadow-black/5",
        className,
      )}
    >
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
  tone?: "emerald" | "amber" | "slate" | "sky";
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
    sky: {
      value: "text-sky-600",
      border: "border-sky-200/80",
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

function ExportRow({
  title,
  description,
  loading,
  onDownload,
}: {
  title: string;
  description: string;
  loading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <LoadingButton
        onClick={onDownload}
        loading={loading}
        loadingText="Preparing…"
        className="rounded-full"
      >
        Download
      </LoadingButton>
    </div>
  );
}

function extractFilename(disposition: string) {
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1];
}

function normalizeRange(range: DateRange): DateRange {
  if (!range.from) return range;
  const from = range.from;
  const to = range.to ? range.to : addDays(range.from, 6);
  if (to < from) {
    return { from: to, to: from };
  }
  return { from, to };
}
