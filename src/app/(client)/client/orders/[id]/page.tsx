export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { getUserFromCookies } from "@/server/auth/server-session";
import { getInvoiceDetail } from "@/server/services/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDistanceToNow } from "date-fns";
import type { JobStatus } from "@/lib/constants/enums";
import { CheckCircle2, Circle, Loader2, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InvoicePaymentSection } from "@/components/client/invoice-payment-section";
import { formatAbn } from "@/lib/utils/formatters";

const JOB_STATUS_FLOW: JobStatus[] = [
  "PRE_PROCESSING",
  "IN_QUEUE",
  "PRINTING",
  "PRINTING_COMPLETE",
  "POST_PROCESSING",
  "PACKAGING",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
];

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PRE_PROCESSING: "Pre-processing",
  QUEUED: "Queued",
  IN_QUEUE: "In queue",
  PRINTING: "Printing",
  PAUSED: "Paused",
  PRINTING_COMPLETE: "Print complete",
  POST_PROCESSING: "Post-processing",
  PACKAGING: "Packaging",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function canonicalizeStatus(status: JobStatus): JobStatus {
  switch (status) {
    case "QUEUED":
      return "IN_QUEUE";
    case "PAUSED":
      return "PRINTING";
    default:
      return status;
  }
}

interface ClientInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientInvoiceDetailPage({ params }: ClientInvoicePageProps) {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (user.role !== "CLIENT") redirect("/dashboard");

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) notFound();

  try {
    const detail = await getInvoiceDetail(id);
    if (user.clientId !== detail.client.id) redirect("/client/orders");

    const hasDiscount =
      (detail.discountType === "PERCENT" && detail.discountValue > 0) ||
      (detail.discountType === "FIXED" && detail.discountValue > 0);
    const discountAmount = hasDiscount
      ? detail.discountType === "PERCENT"
        ? Math.max(0, detail.subtotal * (detail.discountValue / 100))
        : Math.max(0, detail.discountValue)
      : 0;
    const discountedSubtotal = hasDiscount
      ? Math.max(0, detail.subtotal - discountAmount)
      : detail.subtotal;

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Invoice Summary - Mobile optimized */}
        <Card className="border border-border bg-surface-overlay">
          <CardHeader>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">Invoice {detail.number}</CardTitle>
                <p className="text-xs text-muted-foreground">Issued {detail.issueDate.toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto">{detail.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Financial details */}
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              <div className="rounded-lg bg-card/50 p-3">
                <div className="text-xs text-muted-foreground">
                  {hasDiscount ? "Subtotal after discount" : "Subtotal"}
                </div>
                <div className="mt-1 font-medium">${discountedSubtotal.toFixed(2)}</div>
                {hasDiscount ? (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Saved ${discountAmount.toFixed(2)} ({detail.discountValue.toFixed(0)}% student discount)
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg bg-card/50 p-3">
                <div className="text-xs text-muted-foreground">Tax</div>
                <div className="mt-1 font-medium">${detail.taxTotal.toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                <div className="text-xs text-primary">Total</div>
                <div className="mt-1 text-sm font-semibold">${detail.total.toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <div className="text-xs text-amber-700">Balance Due</div>
                <div className="mt-1 font-semibold text-amber-700">${detail.balanceDue.toFixed(2)}</div>
              </div>
            </div>
            {detail.client.abn ? (
              <p className="text-xs text-muted-foreground">
                Customer ABN: {formatAbn(detail.client.abn)}
              </p>
            ) : null}
            {detail.balanceDue > 0 ? (
              <InvoicePaymentSection
                invoiceId={detail.id}
                balanceDue={detail.balanceDue}
              />
            ) : null}
          </CardContent>
        </Card>

        {detail.jobs.length > 0 ? (
          <Card className="border border-border bg-surface-overlay">
            <CardHeader>
              <CardTitle className="text-base">Production Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {detail.jobs.map((job) => {
                  if (job.status === "CANCELLED") {
                    return (
                      <div
                        key={job.id}
                        className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              Last updated {formatDistanceToNow(job.updatedAt, { addSuffix: true })}
                            </p>
                          </div>
                          <StatusBadge status={job.status} size="sm" />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          This job has been cancelled. Please contact our team if you need to restart production.
                        </p>
                        {job.notes ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Note: {job.notes}
                          </p>
                        ) : null}
                      </div>
                    );
                  }

                  const canonical = canonicalizeStatus(job.status);
                  const currentIndex = JOB_STATUS_FLOW.indexOf(canonical);
                  const safeIndex = currentIndex < 0 ? 0 : currentIndex;

                  return (
                    <div
                      key={job.id}
                      className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            Last updated {formatDistanceToNow(job.updatedAt, { addSuffix: true })}
                          </p>
                          {job.printerName ? (
                            <p className="text-xs text-muted-foreground">Printer: {job.printerName}</p>
                          ) : null}
                        </div>
                        <StatusBadge status={job.status} size="sm" />
                      </div>
                      <ol className="relative mt-3 space-y-3 pl-4">
                        {JOB_STATUS_FLOW.map((status, stepIndex) => {
                          const reached = stepIndex <= safeIndex;
                          const isCurrent = stepIndex === safeIndex;
                          const icon = isCurrent
                            ? job.status === "PAUSED"
                              ? (
                                  <PauseCircle className="h-3.5 w-3.5 text-warning" />
                                )
                              : (
                                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                                )
                            : reached
                              ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                )
                              : (
                                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                                );

                          return (
                            <li key={status} className="relative pl-6">
                              <span
                                className={cn(
                                  "absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background",
                                  reached ? "border-primary/60" : "border-border",
                                  isCurrent && "border-primary bg-primary text-primary-foreground",
                                )}
                              >
                                {icon}
                              </span>
                              {stepIndex < JOB_STATUS_FLOW.length - 1 ? (
                                <span className="absolute left-[7px] top-4 h-[calc(100%-16px)] w-px bg-border/60" aria-hidden />
                              ) : null}
                              <span
                                className={cn(
                                  "text-xs uppercase tracking-wide",
                                  reached ? "text-foreground" : "text-muted-foreground",
                                  isCurrent ? "font-semibold" : undefined,
                                )}
                              >
                                {JOB_STATUS_LABELS[status]}
                                {isCurrent && job.status === "PAUSED" ? " (Paused)" : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                      {job.notes ? (
                        <p className="mt-3 text-xs text-muted-foreground">Note: {job.notes}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Attachments - Mobile optimized: Card view on mobile, table on sm+ */}
        <Card className="border border-border bg-surface-overlay">
          <CardHeader>
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments.</p>
            ) : (
              <>
                {/* Mobile: Card View */}
                <div className="space-y-2 sm:hidden">
                  {detail.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/attachments/${att.id}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-card/80 p-3 shadow-sm shadow-black/5 transition hover:bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{att.filename}</p>
                        <p className="text-xs text-muted-foreground">{att.filetype ?? "Unknown"}</p>
                      </div>
                      <div className="ml-3 text-right">
                        <p className="text-xs font-medium text-muted-foreground">{formatSize(att.size)}</p>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Desktop: Table View */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.attachments.map((att) => (
                        <TableRow key={att.id}>
                          <TableCell>
                            <a href={`/api/attachments/${att.id}`} className="underline">{att.filename}</a>
                          </TableCell>
                          <TableCell>{att.filetype ?? ""}</TableCell>
                          <TableCell className="text-right">{formatSize(att.size)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    );
  } catch {
    notFound();
  }
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}
