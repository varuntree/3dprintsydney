"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@/hooks/useNavigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { mutateJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PDFStyleDropdown } from "@/components/ui/pdf-style-dropdown";
import { ActionButtonGroup, ActionGroupContainer } from "@/components/ui/action-button-group";
import { NavigationLink } from "@/components/ui/navigation-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingButton } from "@/components/ui/loading-button";

type QuoteStatusValue = "DRAFT" | "PENDING" | "ACCEPTED" | "DECLINED" | "CONVERTED";

const STATUS_OPTIONS: QuoteStatusValue[] = [
  "DRAFT",
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CONVERTED",
];

export interface QuoteViewModel {
  id: number;
  number: string;
  status: QuoteStatusValue;
  client: { id: number; name: string };
  paymentTerms: { label: string; days: number } | null;
  issueDate: string;
  expiryDate: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string;
  terms: string;
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
}

export interface QuoteViewProps {
  quote: QuoteViewModel;
}

export function QuoteView({ quote }: QuoteViewProps) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<"accept" | "decline" | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const statusMutation = useMutation({
    mutationFn: async (status: QuoteStatusValue) =>
      mutateJson(`/api/quotes/${quote.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      toast.success("Quote status updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quote", quote.id] }),
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => mutateJson(`/api/quotes/${quote.id}/send`, { method: "POST" }),
    onSuccess: () => toast.success("Quote sent"),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to send quote");
    },
  });

  const decisionMutation = useMutation({
    mutationFn: (mode: "accept" | "decline") =>
      mutateJson(`/api/quotes/${quote.id}/${mode}`, {
        method: "POST",
        body: JSON.stringify({ note: decisionNote || undefined }),
      }),
    onSuccess: async (_, mode) => {
      toast.success(`Quote ${mode === "accept" ? "accepted" : "declined"}`);
      setDecision(null);
      setDecisionNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quote", quote.id] }),
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Decision failed");
    },
  });

  const convertMutation = useMutation<{ id: number }>({
    mutationFn: () => mutateJson<{ id: number }>(`/api/quotes/${quote.id}/convert`, { method: "POST" }),
    onSuccess: async (invoice) => {
      toast.success("Quote converted to invoice");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await navigate(`/invoices/${invoice.id}`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to convert quote");
    },
  });

  const duplicateMutation = useMutation<{ id: number }>({
    mutationFn: () => mutateJson<{ id: number }>(`/api/quotes/${quote.id}/duplicate`, {
      method: "POST",
    }),
    onSuccess: async (duplicate) => {
      toast.success("Quote duplicated");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await navigate(`/quotes/${duplicate.id}`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate quote");
    },
  });


  const issueDate = useMemo(() => new Date(quote.issueDate), [quote.issueDate]);
  const expiryDate = useMemo(
    () => (quote.expiryDate ? new Date(quote.expiryDate) : null),
    [quote.expiryDate],
  );
  const paymentTermLabel = useMemo(() => {
    if (!quote.paymentTerms) return "Payment terms unavailable";
    if (quote.paymentTerms.days === 0) {
      return `${quote.paymentTerms.label} • Due on acceptance`;
    }
    return `${quote.paymentTerms.label} • ${quote.paymentTerms.days}-day terms`;
  }, [quote.paymentTerms]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <div className="flex items-center gap-3">
            <StatusBadge status={quote.status} />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
              Quote {quote.number}
            </span>
          </div>
        }
        title={quote.client.name}
        description={
          <span className="text-sm text-muted-foreground">
            Issued {format(issueDate, "dd MMM yyyy")} • Expires {expiryDate ? format(expiryDate, "dd MMM yyyy") : "—"}
          </span>
        }
        meta={<Badge variant="secondary" className="bg-surface-subtle text-foreground">{paymentTermLabel}</Badge>}
        actions={
          <ActionGroupContainer>
            <ActionButtonGroup title="Primary" variant="primary">
              <NavigationLink
                href={`/quotes/${quote.id}?mode=edit`}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Edit
              </NavigationLink>
              <PDFStyleDropdown
                documentType="quote"
                documentId={quote.id}
                documentNumber={quote.number}
              />
              <LoadingButton
                variant="outline"
                onClick={() => sendMutation.mutate()}
                loading={sendMutation.isPending}
                loadingText="Sending…"
              >
                Send
              </LoadingButton>
            </ActionButtonGroup>

            <ActionButtonGroup title="Actions" variant="secondary">
              <Button variant="outline" onClick={() => setDecision("accept")}>
                Accept
              </Button>
              <Button variant="outline" onClick={() => setDecision("decline")}>
                Decline
              </Button>
              <LoadingButton
                variant="outline"
                onClick={() => convertMutation.mutate()}
                loading={convertMutation.isPending}
                loadingText="Converting…"
              >
                Convert to invoice
              </LoadingButton>
              <LoadingButton
                variant="subtle"
                size="sm"
                onClick={() => duplicateMutation.mutate()}
                loading={duplicateMutation.isPending}
                loadingText="Duplicating…"
              >
                Duplicate
              </LoadingButton>
            </ActionButtonGroup>

            <ActionButtonGroup title="Status" variant="secondary">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="subtle" size="sm">
                    Change status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Set status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {STATUS_OPTIONS.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => statusMutation.mutate(status)}
                      disabled={statusMutation.isPending || status === quote.status}
                    >
                      {status.toLowerCase()}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </ActionButtonGroup>
          </ActionGroupContainer>
        }
      />

      <Card className="border border-zinc-200/70 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <SummaryItem label="Subtotal" value={formatCurrency(quote.subtotal)} />
          <SummaryItem label="Tax" value={formatCurrency(quote.taxTotal)} />
          <SummaryItem label="Total" value={formatCurrency(quote.total)} emphasize />
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
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.lines.map((line) => (
                <TableRow key={line.id ?? `${line.name}-${line.orderIndex}`}
                  className="align-top">
                  <TableCell className="font-medium text-zinc-800">{line.name}</TableCell>
                  <TableCell className="text-sm text-zinc-500 whitespace-pre-wrap">
                    {line.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">{formatQuantity(line.quantity)}</TableCell>
                  <TableCell>{line.unit || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                  <TableCell className="text-right">{discountLabel(line.discountType, line.discountValue)}</TableCell>
                  <TableCell className="text-right font-medium text-zinc-800">{formatCurrency(line.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(quote.notes || quote.terms) && (
        <Card className="border border-zinc-200/70 bg-white shadow-sm">
          <CardContent className="grid gap-6 md:grid-cols-2">
            {quote.notes ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Notes</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{quote.notes}</p>
              </div>
            ) : null}
            {quote.terms ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Terms</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{quote.terms}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <DecisionDialog
        mode={decision}
        note={decisionNote}
        onClose={() => {
          setDecision(null);
          setDecisionNote("");
        }}
        onConfirm={() => {
          if (!decision) return;
          decisionMutation.mutate(decision);
        }}
        onNoteChange={setDecisionNote}
        isLoading={decisionMutation.isPending}
      />
    </div>
  );
}

function SummaryItem({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200/70 bg-white/80 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">{label}</p>
      <p className={cn("mt-2 text-sm", emphasize ? "font-semibold text-zinc-900" : "text-zinc-600")}>{value}</p>
    </div>
  );
}

// Status styling now handled by StatusBadge component using semantic tokens

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function discountLabel(type: string, value?: number | null) {
  if (type === "PERCENT") {
    return `${value ?? 0}%`;
  }
  if (type === "FIXED") {
    return formatCurrency(value ?? 0);
  }
  return "—";
}

interface DecisionDialogProps {
  mode: "accept" | "decline" | null;
  note: string;
  isLoading: boolean;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function DecisionDialog({ mode, note, onNoteChange, onClose, onConfirm, isLoading }: DecisionDialogProps) {
  const title = mode === "accept" ? "Accept quote" : mode === "decline" ? "Decline quote" : null;
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {title ? (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                Add an internal note (optional). The status will be updated automatically.
              </p>
              <Textarea rows={4} value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Add decision note (optional)" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={onConfirm} disabled={isLoading}>
                {isLoading ? "Saving…" : title}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
