"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { mutateJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PdfGenerateButton } from "@/components/ui/pdf-generate-button";
import {
  ActionButtonGroup,
  ActionGroupContainer,
} from "@/components/ui/action-button-group";
import { StatusBadge } from "@/components/ui/status-badge";
import { NavigationLink } from "@/components/ui/navigation-link";
import { useNavigation } from "@/hooks/useNavigation";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";
import { useStripeStatus } from "@/hooks/use-stripe-status";

export type InvoiceStatusValue = "PENDING" | "PAID" | "OVERDUE";

export interface InvoiceViewModel {
  id: number;
  number: string;
  status: InvoiceStatusValue;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  clientName: string;
  paymentTerms: { label: string; days: number } | null;
  subtotal: number;
  shippingCost: number;
  taxTotal: number;
  total: number;
  balanceDue: number;
  notes: string;
  terms: string;
  currency: string;
  stripeCheckoutUrl: string | null;
  lines: Array<{
    id: number | null;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    discountType: string;
    discountValue: number | null;
    total: number;
    orderIndex: number;
  }>;
  bankDetails?: string | null;
}

interface InvoiceViewProps {
  invoice: InvoiceViewModel;
}

export function InvoiceView({ invoice }: InvoiceViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { navigate, beginBusy, endBusy } = useNavigation();

  const markPaidMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/invoices/${invoice.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: async () => {
      toast.success("Invoice marked as paid");
      await refreshInvoice();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as paid",
      );
    },
  });

  const markUnpaidMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/invoices/${invoice.id}/mark-unpaid`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("Invoice marked as unpaid");
      await refreshInvoice();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as unpaid",
      );
    },
  });

  const stripeMutation = useMutation<
    { url: string | null },
    Error,
    boolean | undefined
  >({
    mutationFn: (refresh) =>
      mutateJson<{ url: string | null }>(
        `/api/invoices/${invoice.id}/stripe-session${refresh ? "?refresh=true" : ""}`,
        { method: "POST" },
      ),
    onSuccess: async (data, refreshFlag) => {
      if (data.url) {
        toast.success(
          refreshFlag ? "Payment link refreshed" : "Payment link generated",
        );
        window.location.href = data.url;
      } else {
        toast.error("Stripe session did not return a redirect URL");
      }
      await refreshInvoice();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create Stripe session",
      );
    },
  });

  const revertMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/invoices/${invoice.id}/revert`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("Invoice reverted to quote");
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await navigate("/quotes");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Revert failed"),
  });

  const voidMutation = useMutation({
    mutationFn: (reason?: string) =>
      mutateJson(`/api/invoices/${invoice.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: async () => {
      toast.success("Invoice voided");
      await refreshInvoice();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Void failed"),
  });

  const writeOffMutation = useMutation({
    mutationFn: (reason?: string) =>
      mutateJson(`/api/invoices/${invoice.id}/write-off`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: async () => {
      toast.success("Invoice written off");
      await refreshInvoice();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Write off failed"),
  });

  const paymentTermsLabel = useMemo(() => {
    if (invoice.paymentTerms) {
      if (invoice.paymentTerms.days === 0) {
        return `${invoice.paymentTerms.label} • Due immediately`;
      }
      return `${invoice.paymentTerms.label} • ${invoice.paymentTerms.days}-day terms`;
    }
    return "COD • Due immediately";
  }, [invoice.paymentTerms]);

  const issueDate = useMemo(
    () => new Date(invoice.issueDate),
    [invoice.issueDate],
  );
  const dueDate = useMemo(
    () => (invoice.dueDate ? new Date(invoice.dueDate) : null),
    [invoice.dueDate],
  );
  const paidAt = useMemo(
    () => (invoice.paidAt ? new Date(invoice.paidAt) : null),
    [invoice.paidAt],
  );
  const isOverdue = invoice.status === "OVERDUE";
  const hasStripeLink = Boolean(invoice.stripeCheckoutUrl);
  const stripeStatus = useStripeStatus();
  const stripeConfigured =
    stripeStatus.data?.ok === true && !stripeStatus.isError;
  const stripeStatusMeta = stripeStatus.isLoading ? (
    <InlineLoader label="Checking payments…" className="text-[10px]" />
  ) : !stripeConfigured ? (
    <Badge
      variant="outline"
      className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
    >
      Stripe disabled
    </Badge>
  ) : null;

  const handleStripeAction = (refresh?: boolean) => {
    if (!stripeConfigured) {
      toast.error("Stripe payments are not configured.");
      return;
    }
    stripeMutation.mutate(refresh);
  };

  async function refreshInvoice() {
    beginBusy();
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] }),
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      ]);
      router.refresh();
    } finally {
      window.setTimeout(() => {
        endBusy();
      }, 120);
    }
  }

  return (
    <>
      <header className="rounded-3xl border border-border bg-surface-elevated/80 p-6 shadow-sm shadow-black/5 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <StatusBadge status={invoice.status} />
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                Invoice {invoice.number}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {invoice.clientName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Issued {format(issueDate, "dd MMM yyyy")} • Due{" "}
              {dueDate ? format(dueDate, "dd MMM yyyy") : "—"}
              {isOverdue ? " · overdue" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border border-border bg-surface-overlay px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {paymentTermsLabel}
            </Badge>
            <ActionGroupContainer>
              <ActionButtonGroup title="Primary" variant="primary">
                <NavigationLink
                  href={`/invoices/${invoice.id}?mode=edit`}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  Edit
                </NavigationLink>
                <PdfGenerateButton
                  documentType="invoice"
                  documentId={invoice.id}
                  documentNumber={invoice.number}
                />
              </ActionButtonGroup>

              <ActionButtonGroup
                title="Payment"
                variant="secondary"
                meta={stripeStatusMeta}
              >
                <LoadingButton
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleStripeAction(false)}
                  loading={stripeMutation.isPending}
                  loadingText={hasStripeLink ? "Opening…" : "Generating…"}
                  disabled={!stripeConfigured}
                  title={
                    !stripeConfigured ? "Stripe payments disabled" : undefined
                  }
                >
                  {hasStripeLink ? "Open payment link" : "Generate payment link"}
                </LoadingButton>
                <LoadingButton
                  variant="subtle"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleStripeAction(true)}
                  disabled={!hasStripeLink || !stripeConfigured}
                  loading={stripeMutation.isPending}
                  loadingText="Refreshing…"
                  title={!hasStripeLink ? "No link to refresh" : undefined}
                >
                  Refresh link
                </LoadingButton>
                <LoadingButton
                  variant="subtle"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    if (!invoice.stripeCheckoutUrl) return;
                    navigator.clipboard
                      .writeText(invoice.stripeCheckoutUrl)
                      .then(() => toast.success("Payment link copied"))
                      .catch(() => toast.error("Unable to copy link"));
                  }}
                  disabled={!hasStripeLink || !stripeConfigured}
                >
                  Copy link
                </LoadingButton>
                <LoadingButton
                  variant="outline"
                  className="rounded-full"
                  onClick={() => markPaidMutation.mutate()}
                  disabled={invoice.balanceDue <= 0}
                  loading={markPaidMutation.isPending}
                  loadingText="Marking…"
                >
                  Mark paid
                </LoadingButton>
                <LoadingButton
                  variant="subtle"
                  size="sm"
                  className="rounded-full"
                  onClick={() => markUnpaidMutation.mutate()}
                  disabled={invoice.status !== "PAID"}
                  loading={markUnpaidMutation.isPending}
                  loadingText="Reverting…"
                >
                  Mark unpaid
                </LoadingButton>
              </ActionButtonGroup>

              <ActionButtonGroup title="Administrative" variant="destructive">
                <LoadingButton
                  variant="subtle"
                  size="sm"
                  className="rounded-full border-rose-200/80 text-rose-700 hover:bg-rose-600 hover:text-white"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Revert invoice to quote? Payments will be cleared.",
                      )
                    )
                      return;
                    revertMutation.mutate();
                  }}
                  disabled={invoice.status === "PAID"}
                  loading={revertMutation.isPending}
                  loadingText="Reverting…"
                >
                  Revert
                </LoadingButton>
                <LoadingButton
                  variant="destructive"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const reason =
                      window.prompt("Enter void reason (optional)") ?? undefined;
                    voidMutation.mutate(reason);
                  }}
                  disabled={invoice.status === "PAID"}
                  loading={voidMutation.isPending}
                  loadingText="Voiding…"
                >
                  Void
                </LoadingButton>
                <LoadingButton
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const reason =
                      window.prompt("Enter write-off reason (optional)") ??
                      undefined;
                    writeOffMutation.mutate(reason);
                  }}
                  disabled={invoice.status === "PAID"}
                  loading={writeOffMutation.isPending}
                  loadingText="Writing off…"
                >
                  Write off
                </LoadingButton>
              </ActionButtonGroup>
            </ActionGroupContainer>
          </div>
        </div>
      </header>

      <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Payment terms" value={paymentTermsLabel} />
          <SummaryCard
            label="Balance due"
            value={formatCurrency(invoice.balanceDue, invoice.currency)}
            emphasize
            tone={invoice.balanceDue > 0 ? "warning" : "success"}
          />
          <SummaryCard
            label="Issued"
            value={format(issueDate, "dd MMM yyyy")}
          />
          <SummaryCard
            label="Due date"
            value={dueDate ? format(dueDate, "dd MMM yyyy") : "—"}
            tone={isOverdue ? "danger" : undefined}
          />
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Line items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile view */}
          <div className="space-y-3 md:hidden">
            {invoice.lines.map((line, index) => {
              const hasDiscount = line.discountType !== "NONE" && (line.discountValue ?? 0) > 0;
              return (
                <Card key={index} className="rounded-2xl border border-border bg-background">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">{line.name}</h4>
                      {line.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {line.description}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>
                          <span className="text-muted-foreground">Qty:</span> {formatQuantity(line.quantity)} {line.unit}
                        </span>
                        <span>
                          <span className="text-muted-foreground">Price:</span> {formatCurrency(line.unitPrice, invoice.currency)}
                        </span>
                      </div>
                      {hasDiscount && (
                        <div className="text-sm text-muted-foreground">
                          Discount: {discountLabel(line.discountType, line.discountValue ?? 0, invoice.currency)}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1 border-t border-border">
                        <span className="text-sm text-muted-foreground">Line total</span>
                        <span className="font-medium text-foreground">{formatCurrency(line.total, invoice.currency)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop view */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow
                  key={line.id ?? `${line.name}-${line.orderIndex}`}
                  className="align-top"
                >
                  <TableCell className="font-medium text-foreground">
                    {line.name}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {line.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(line.quantity)}
                  </TableCell>
                  <TableCell>{line.unit || "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.unitPrice, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {discountLabel(
                      line.discountType,
                      line.discountValue,
                      invoice.currency,
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {formatCurrency(line.total, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TotalsSection
        subtotal={invoice.subtotal}
        shippingCost={invoice.shippingCost}
        taxTotal={invoice.taxTotal}
        total={invoice.total}
        balanceDue={invoice.balanceDue}
        currency={invoice.currency}
        paidAt={paidAt}
      />

      {(invoice.notes || invoice.terms || invoice.bankDetails) && (
        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardContent className="grid gap-6 md:grid-cols-3">
            {invoice.notes ? (
              <Panel title="Notes" content={invoice.notes} />
            ) : null}
            {invoice.terms ? (
              <Panel title="Terms" content={invoice.terms} />
            ) : null}
            {invoice.bankDetails ? (
              <Panel
                title="Bank details"
                content={invoice.bankDetails}
                monospace
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Status styling now handled by StatusBadge component using semantic tokens

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function discountLabel(
  type: string,
  value: number | null | undefined,
  currency: string,
) {
  if (type === "PERCENT") {
    return `${(value ?? 0).toFixed(2)}%`;
  }
  if (type === "FIXED") {
    return formatCurrency(value ?? 0, currency);
  }
  return "—";
}

function SummaryCard({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border border-border bg-warning-subtle text-warning-foreground"
      : tone === "danger"
        ? "border border-border bg-danger-subtle text-destructive"
        : tone === "success"
          ? "border border-border bg-success-subtle text-success-foreground"
          : "border border-border bg-surface-overlay text-muted-foreground";
  return (
    <div className={cn("rounded-2xl p-4 shadow-sm", toneClass)}>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-sm text-foreground",
          emphasize ? "text-base font-semibold" : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TotalsSection({
  subtotal,
  shippingCost,
  taxTotal,
  total,
  balanceDue,
  currency,
  paidAt,
}: {
  subtotal: number;
  shippingCost: number;
  taxTotal: number;
  total: number;
  balanceDue: number;
  currency: string;
  paidAt: Date | null;
}) {
  return (
    <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
      <CardContent className="flex justify-end">
        <table className="w-full max-w-sm text-sm">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="text-right">
                {formatCurrency(subtotal, currency)}
              </td>
            </tr>
            <tr>
              <td>Shipping</td>
              <td className="text-right">
                {formatCurrency(shippingCost, currency)}
              </td>
            </tr>
            <tr>
              <td>Tax</td>
              <td className="text-right">
                {formatCurrency(taxTotal, currency)}
              </td>
            </tr>
            <tr>
              <td className="pt-2 font-semibold">Total</td>
              <td className="pt-2 text-right font-semibold">
                {formatCurrency(total, currency)}
              </td>
            </tr>
            <tr>
              <td className="font-semibold">Balance due</td>
              <td
                className={cn(
                  "text-right font-semibold",
                  balanceDue > 0
                    ? "text-warning-foreground"
                    : "text-success-foreground",
                )}
              >
                {formatCurrency(balanceDue, currency)}
              </td>
            </tr>
            {paidAt ? (
              <tr>
                <td>Paid at</td>
                <td className="text-right">{format(paidAt, "dd MMM yyyy")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  content,
  monospace,
}: {
  title: string;
  content: string;
  monospace?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
      <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
        {title}
      </h3>
      <p
        className={cn(
          "mt-3 whitespace-pre-wrap text-sm text-muted-foreground",
          monospace && "font-mono text-xs text-zinc-700",
        )}
      >
        {content}
      </p>
    </div>
  );
}
