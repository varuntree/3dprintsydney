"use client";

import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { mutateJson } from "@/lib/http";

const statusStyles: Record<string, string> = {
  PENDING: "border-amber-200/70 bg-amber-50 text-amber-700",
  PAID: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  OVERDUE: "border-rose-200/70 bg-rose-50 text-rose-700",
};

interface InvoiceActionsProps {
  invoiceId: number;
  invoiceNumber: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  balanceDue: number;
  total: number;
  currency: string;
  dueDate?: string | null;
  paidAt?: string | null;
  stripeReady: boolean;
}

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  balanceDue,
  total,
  currency,
  dueDate,
  paidAt,
  stripeReady,
}: InvoiceActionsProps) {
  const router = useRouter();

  const amountLabel = formatCurrency(balanceDue, currency);
  const totalLabel = formatCurrency(total, currency);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "PAID":
        return "Paid";
      case "OVERDUE":
        return "Overdue";
      default:
        return status;
    }
  }, [status]);

  const markPaidMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as paid",
      );
    },
  });

  const markUnpaidMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/invoices/${invoiceId}/mark-unpaid`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Invoice marked as unpaid");
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as unpaid",
      );
    },
  });

  const stripeMutation = useMutation({
    mutationFn: async () =>
      mutateJson<{ url: string }>(`/api/invoices/${invoiceId}/stripe-session`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      const url = data.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Stripe session did not return a redirect URL");
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to start Stripe checkout",
      );
    },
  });

  const showStripe = stripeReady && balanceDue > 0 && status !== "PAID";
  const canRevert = status !== "PAID" && Math.abs(balanceDue - total) < 0.01;

  function handleMarkPaid() {
    if (balanceDue <= 0) {
      toast.info("Invoice already settled");
      return;
    }
    markPaidMutation.mutate();
  }

  function handleMarkUnpaid() {
    if (
      !window.confirm(
        "Marking the invoice as unpaid will clear all recorded payments. Continue?",
      )
    ) {
      return;
    }
    markUnpaidMutation.mutate();
  }

  const revertMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/invoices/${invoiceId}/revert`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Invoice reverted to quote");
      router.push(`/quotes`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to revert invoice",
      );
    },
  });

  function handleRevert() {
    if (
      !window.confirm(
        "Reverting will delete this invoice and restore a quote copy. Continue?",
      )
    ) {
      return;
    }
    revertMutation.mutate();
  }

  const dueLabel = dueDate ? format(new Date(dueDate), "dd MMM yyyy") : "—";
  const paidLabel = paidAt ? format(new Date(paidAt), "dd MMM yyyy") : "—";

  const voidMutation = useMutation({
    mutationFn: (reason?: string) => mutateJson(`/api/invoices/${invoiceId}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => { toast.success("Invoice voided"); router.refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to void invoice"),
  });
  const writeOffMutation = useMutation({
    mutationFn: (reason?: string) => mutateJson(`/api/invoices/${invoiceId}/write-off`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => { toast.success("Invoice written off"); router.refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to write off invoice"),
  });

  return (
    <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={
              statusStyles[status] ?? "border-zinc-200/70 bg-white/80 text-zinc-600"
            }
          >
            {statusLabel}
          </Badge>
          <span className="text-sm text-zinc-500">
            Invoice {invoiceNumber}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>
            Total <strong className="text-zinc-700">{totalLabel}</strong>
          </span>
          <span className="text-zinc-400">•</span>
          <span>
            Balance due {" "}
            <strong className="text-zinc-700">{amountLabel}</strong>
          </span>
          <span className="text-zinc-400">•</span>
          <span>Due {dueLabel}</span>
          {status === "PAID" ? (
            <>
              <span className="text-zinc-400">•</span>
              <span>Paid {paidLabel}</span>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-zinc-500">
          {status === "PAID"
            ? "Need to reopen the invoice? Clear payments and revert it here."
            : "Use quick actions to collect payment or zero the balance."}
          {!stripeReady ? (
            <div className="mt-2 rounded-md border border-zinc-200/70 bg-white/80 p-2 text-xs">
              Stripe checkout is disabled. Add your publishable and secret keys in Settings → Integrations.
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleMarkPaid}
            disabled={markPaidMutation.isPending || balanceDue <= 0}
          >
            {markPaidMutation.isPending ? "Marking…" : "Mark paid"}
          </Button>
          <Button
            onClick={() => stripeMutation.mutate()}
            disabled={!showStripe || stripeMutation.isPending}
            title={
              showStripe
                ? undefined
                : "Stripe checkout requires publishable and secret keys in Settings"
            }
          >
            {stripeMutation.isPending ? "Opening Stripe…" : "Stripe checkout"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleMarkUnpaid}
            disabled={markUnpaidMutation.isPending || status !== "PAID"}
          >
            {markUnpaidMutation.isPending ? "Reverting…" : "Mark unpaid"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleRevert}
            disabled={!canRevert || revertMutation.isPending}
            title={
              canRevert
                ? undefined
                : "Invoice must be unpaid with no recorded payments"
            }
          >
            {revertMutation.isPending ? "Reverting…" : "Revert to quote"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const reason = window.prompt("Enter void reason (optional)") ?? undefined;
              if (!window.confirm("Void this invoice? This will zero the balance and lock it.")) return;
              voidMutation.mutate(reason);
            }}
            disabled={voidMutation.isPending || status === "PAID"}
            title={status === "PAID" ? "Cannot void a paid invoice" : undefined}
          >
            {voidMutation.isPending ? "Voiding…" : "Void"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const reason = window.prompt("Enter write-off reason (optional)") ?? undefined;
              if (!window.confirm("Write off this invoice? This will zero the balance and mark it closed.")) return;
              writeOffMutation.mutate(reason);
            }}
            disabled={writeOffMutation.isPending || status === "PAID"}
            title={status === "PAID" ? "Already paid" : undefined}
          >
            {writeOffMutation.isPending ? "Writing off…" : "Write off"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
