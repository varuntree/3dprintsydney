"use client";

import { useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ExportKind = "invoices" | "payments" | "jobs" | "ar-aging" | "material-usage" | "printer-utilization";

export default function ReportsPage() {
  const defaultRange = useMemo<DateRange>(() => {
    const to = new Date();
    const from = subDays(to, 29);
    return { from, to };
  }, []);

  const [range, setRange] = useState<DateRange | undefined>(defaultRange);
  const [busy, setBusy] = useState<ExportKind | null>(null);

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
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  const dateSummary = range?.from
    ? `${format(range.from, "dd MMM yyyy")} → ${format(range?.to ?? range.from, "dd MMM yyyy")}`
    : "All time";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Reports & Exports
          </h2>
          <p className="text-sm text-zinc-500">
            Export invoices, payments, and jobs.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
          Range: {dateSummary}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
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
              className="rounded-xl border border-zinc-200/70 bg-white/80"
            />
            <Button
              variant="ghost"
              className="mt-4 text-xs text-zinc-500"
              onClick={() => setRange(defaultRange)}
            >
              Reset to last 30 days
            </Button>
          </CardContent>
        </Card>
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
              Exports
            </CardTitle>
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white/80 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-800">{title}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <Button onClick={onDownload} disabled={loading}>
        {loading ? "Preparing…" : "Download"}
      </Button>
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
