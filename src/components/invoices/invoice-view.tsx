"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { mutateJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

  const markPaidMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/invoices/${invoice.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      refreshInvoice();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to mark as paid");
    },
  });

  const markUnpaidMutation = useMutation({
    mutationFn: () => mutateJson(`/api/invoices/${invoice.id}/mark-unpaid`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Invoice marked as unpaid");
      refreshInvoice();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to mark as unpaid");
    },
  });

  const stripeMutation = useMutation<{ url: string | null }, Error, boolean | undefined>({
    mutationFn: (refresh) =>
      mutateJson<{ url: string | null }>(
        `/api/invoices/${invoice.id}/stripe-session${refresh ? "?refresh=true" : ""}`,
        { method: "POST" },
      ),
    onSuccess: (data, refreshFlag) => {
      if (data.url) {
        toast.success(refreshFlag ? "Payment link refreshed" : "Payment link generated");
        window.location.href = data.url;
      } else {
        toast.error("Stripe session did not return a redirect URL");
      }
      refreshInvoice();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Unable to create Stripe session");
    },
  });

  const revertMutation = useMutation({
    mutationFn: () => mutateJson(`/api/invoices/${invoice.id}/revert`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Invoice reverted to quote");
      router.push("/quotes");
      router.refresh();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Revert failed"),
  });

  const voidMutation = useMutation({
    mutationFn: (reason?: string) => mutateJson(`/api/invoices/${invoice.id}/void`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
    onSuccess: () => {
      toast.success("Invoice voided");
      refreshInvoice();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Void failed"),
  });

  const writeOffMutation = useMutation({
    mutationFn: (reason?: string) => mutateJson(`/api/invoices/${invoice.id}/write-off`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
    onSuccess: () => {
      toast.success("Invoice written off");
      refreshInvoice();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Write off failed"),
  });

  const paymentTermsLabel = useMemo(() => {
    if (!invoice.paymentTerms) return "Payment terms unavailable";
    if (invoice.paymentTerms.days === 0) {
      return `${invoice.paymentTerms.label} • Due immediately`;
    }
    return `${invoice.paymentTerms.label} • ${invoice.paymentTerms.days}-day terms`;
  }, [invoice.paymentTerms]);

  const issueDate = useMemo(() => new Date(invoice.issueDate), [invoice.issueDate]);
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

  const downloadPdf = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `invoice-${invoice.number}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice PDF generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download PDF");
    }
  };

  function refreshInvoice() {
    queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={cn("uppercase tracking-wide", statusTone(invoice.status))}>
              {invoice.status.toLowerCase()}
            </Badge>
            <span className="text-sm text-zinc-500">Invoice {invoice.number}</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">{invoice.clientName}</h1>
          <p className="text-sm text-zinc-500">
            Issued {format(issueDate, "dd MMM yyyy")} • Due {dueDate ? format(dueDate, "dd MMM yyyy") : "—"}
            {isOverdue ? " (overdue)" : ""}
          </p>
          <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
            {paymentTermsLabel}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/invoices/${invoice.id}?mode=edit`}>Edit</Link>
          </Button>
          <Button variant="outline" onClick={downloadPdf}>PDF</Button>
          <Button
            variant="outline"
            onClick={() => stripeMutation.mutate(false)}
            disabled={stripeMutation.isPending}
          >
            {stripeMutation.isPending ? "Opening…" : hasStripeLink ? "Open payment link" : "Generate payment link"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => stripeMutation.mutate(true)}
            disabled={!hasStripeLink || stripeMutation.isPending}
            title={!hasStripeLink ? "No link to refresh" : undefined}
          >
            Refresh link
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (!invoice.stripeCheckoutUrl) return;
              navigator.clipboard
                .writeText(invoice.stripeCheckoutUrl)
                .then(() => toast.success("Payment link copied"))
                .catch(() => toast.error("Unable to copy link"));
            }}
            disabled={!hasStripeLink}
          >
            Copy link
          </Button>
          <Button
            variant="outline"
            onClick={() => markPaidMutation.mutate()}
            disabled={markPaidMutation.isPending || invoice.balanceDue <= 0}
          >
            {markPaidMutation.isPending ? "Marking…" : "Mark paid"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => markUnpaidMutation.mutate()}
            disabled={markUnpaidMutation.isPending || invoice.status !== "PAID"}
          >
            {markUnpaidMutation.isPending ? "Reverting…" : "Mark unpaid"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (!window.confirm("Revert invoice to quote? Payments will be cleared.")) return;
              revertMutation.mutate();
            }}
            disabled={revertMutation.isPending || invoice.status === "PAID"}
          >
            {revertMutation.isPending ? "Reverting…" : "Revert"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const reason = window.prompt("Enter void reason (optional)") ?? undefined;
              voidMutation.mutate(reason);
            }}
            disabled={voidMutation.isPending || invoice.status === "PAID"}
          >
            {voidMutation.isPending ? "Voiding…" : "Void"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const reason = window.prompt("Enter write-off reason (optional)") ?? undefined;
              writeOffMutation.mutate(reason);
            }}
            disabled={writeOffMutation.isPending || invoice.status === "PAID"}
          >
            {writeOffMutation.isPending ? "Writing off…" : "Write off"}
          </Button>
        </div>
      </div>

      <Card className="border border-zinc-200/70 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">Summary</CardTitle>
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

      <Card className="border border-zinc-200/70 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
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
                <TableRow key={line.id ?? `${line.name}-${line.orderIndex}`}
                  className="align-top">
                  <TableCell className="font-medium text-zinc-800">{line.name}</TableCell>
                  <TableCell className="text-sm text-zinc-500 whitespace-pre-wrap">{line.description || "—"}</TableCell>
                  <TableCell className="text-right">{formatQuantity(line.quantity)}</TableCell>
                  <TableCell>{line.unit || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unitPrice, invoice.currency)}</TableCell>
                  <TableCell className="text-right">{discountLabel(line.discountType, line.discountValue, invoice.currency)}</TableCell>
                  <TableCell className="text-right font-medium text-zinc-800">{formatCurrency(line.total, invoice.currency)}</TableCell>
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
        <Card className="border border-zinc-200/70 bg-white shadow-sm">
          <CardContent className="grid gap-6 md:grid-cols-3">
            {invoice.notes ? (
              <Panel title="Notes" content={invoice.notes} />
            ) : null}
            {invoice.terms ? (
              <Panel title="Terms" content={invoice.terms} />
            ) : null}
            {invoice.bankDetails ? (
              <Panel title="Bank details" content={invoice.bankDetails} monospace />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function statusTone(status: InvoiceStatusValue) {
  switch (status) {
    case "PAID":
      return "border-emerald-200/70 bg-emerald-50 text-emerald-700";
    case "OVERDUE":
      return "border-rose-200/70 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200/70 bg-amber-50 text-amber-700";
  }
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function discountLabel(type: string, value: number | null | undefined, currency: string) {
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
      ? "border-amber-200/70 bg-amber-50 text-amber-700"
      : tone === "danger"
        ? "border-rose-200/70 bg-rose-50 text-rose-700"
        : tone === "success"
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
          : "border-zinc-200/70 bg-white/80 text-zinc-600";
  return (
    <div className={cn("rounded-lg border p-4 shadow-sm", toneClass)}>
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      <p className={cn("mt-2 text-sm", emphasize ? "text-base font-semibold" : "")}>{value}</p>
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
    <Card className="border border-zinc-200/70 bg-white shadow-sm">
      <CardContent className="flex justify-end">
        <table className="w-full max-w-sm text-sm">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="text-right">{formatCurrency(subtotal, currency)}</td>
            </tr>
            <tr>
              <td>Shipping</td>
              <td className="text-right">{formatCurrency(shippingCost, currency)}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td className="text-right">{formatCurrency(taxTotal, currency)}</td>
            </tr>
            <tr>
              <td className="pt-2 font-semibold">Total</td>
              <td className="pt-2 text-right font-semibold">{formatCurrency(total, currency)}</td>
            </tr>
            <tr>
              <td className="font-semibold">Balance due</td>
              <td className={cn("text-right font-semibold", balanceDue > 0 ? "text-amber-700" : "text-emerald-700")}> 
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

function Panel({ title, content, monospace }: { title: string; content: string; monospace?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200/70 bg-white/80 p-4 shadow-sm">
      <h3 className="text-xs uppercase tracking-[0.3em] text-zinc-400">{title}</h3>
      <p className={cn("mt-3 whitespace-pre-wrap text-sm text-zinc-600", monospace && "font-mono text-xs text-zinc-700")}>{content}</p>
    </div>
  );
}
