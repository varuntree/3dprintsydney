"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@/hooks/useNavigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { mutateJson } from "@/lib/http";
import { getUserMessage } from "@/lib/errors/user-messages";
import { formatCurrency, formatAbn } from "@/lib/utils/formatters";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PdfGenerateButton } from "@/components/ui/pdf-generate-button";
import {
  ActionButtonGroup,
  ActionGroupContainer,
} from "@/components/ui/action-button-group";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";

type QuoteStatusValue =
  | "DRAFT"
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CONVERTED";

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
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  abn: string | null;
  currency: string;
  paymentTerms: { label: string; days: number } | null;
  issueDate: string;
  expiryDate: string | null;
  subtotal: number;
  discountType: string;
  discountValue: number | null;
  shippingCost: number;
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
    calculatorBreakdown: Record<string, unknown> | null;
    lineType: "PRINT" | "MODELLING";
    modellingBrief?: string;
    modellingComplexity?: string | null;
    modellingRevisionCount?: number;
    modellingHourlyRate?: number;
    modellingEstimatedHours?: number;
  }>;
}

export interface QuoteViewProps {
  quote: QuoteViewModel;
}

export function QuoteView({ quote }: QuoteViewProps) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<"decline" | null>(null);
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
      toast.error(getUserMessage(error));
    },
  });

  const declineMutation = useMutation({
    mutationFn: () =>
      mutateJson(`/api/quotes/${quote.id}/decline`, {
        method: "POST",
        body: JSON.stringify({ note: decisionNote || undefined }),
      }),
    onSuccess: async () => {
      toast.success("Quote declined");
      setDecision(null);
      setDecisionNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quote", quote.id] }),
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  const convertMutation = useMutation<{ id: number }>({
    mutationFn: () =>
      mutateJson<{ id: number }>(`/api/quotes/${quote.id}/convert`, {
        method: "POST",
      }),
    onSuccess: async (invoice) => {
      toast.success("Quote converted to invoice");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await navigate(`/invoices/${invoice.id}`);
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  const duplicateMutation = useMutation<{ id: number }>({
    mutationFn: () =>
      mutateJson<{ id: number }>(`/api/quotes/${quote.id}/duplicate`, {
        method: "POST",
      }),
    onSuccess: async (duplicate) => {
      toast.success("Quote duplicated");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await navigate(`/quotes/${duplicate.id}`);
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  const isBusy =
    statusMutation.isPending ||
    declineMutation.isPending ||
    convertMutation.isPending ||
    duplicateMutation.isPending;

  const issueDate = useMemo(() => new Date(quote.issueDate), [quote.issueDate]);
  const expiryDate = useMemo(
    () => (quote.expiryDate ? new Date(quote.expiryDate) : null),
    [quote.expiryDate],
  );
  const paymentTermLabel = useMemo(() => {
    if (!quote.paymentTerms) return "COD • Due on acceptance";
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
          <div className="space-y-1 text-sm text-muted-foreground">
            <span>
              Issued {format(issueDate, "dd MMM yyyy")} • Expires{" "}
              {expiryDate ? format(expiryDate, "dd MMM yyyy") : "—"}
            </span>
            {quote.abn ? <span>ABN {formatAbn(quote.abn)}</span> : null}
          </div>
        }
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border border-border bg-surface-overlay px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {paymentTermLabel}
            </Badge>
            {isBusy ? (
              <InlineLoader label="Updating…" className="text-[10px]" />
            ) : null}
          </div>
        }
        actions={
          <ActionGroupContainer>
            <ActionButtonGroup title="Primary" variant="primary">
              <ActionButton
                href={`/quotes/${quote.id}?mode=edit`}
                className="gap-2 rounded-full"
              >
                Edit
              </ActionButton>
            <PdfGenerateButton
              documentType="quote"
              documentNumber={quote.number}
              data={quote}
            />
            </ActionButtonGroup>

            <ActionButtonGroup title="Actions" variant="secondary">
              <LoadingButton
                variant="outline"
                onClick={() => convertMutation.mutate()}
                loading={convertMutation.isPending}
                loadingText="Converting…"
                className="gap-2 rounded-full"
              >
                Accept &amp; convert
              </LoadingButton>
              <Button
                variant="outline"
                onClick={() => setDecision("decline")}
                className="gap-2 rounded-full"
              >
                Decline
              </Button>
              <LoadingButton
                variant="subtle"
                size="sm"
                onClick={() => duplicateMutation.mutate()}
                loading={duplicateMutation.isPending}
                loadingText="Duplicating…"
                className="gap-2 rounded-full"
              >
                Duplicate
              </LoadingButton>
            </ActionButtonGroup>

            <ActionButtonGroup title="Status" variant="secondary">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="subtle" size="sm" className="gap-2 rounded-full">
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
                      disabled={
                        statusMutation.isPending || status === quote.status
                      }
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

      <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <SummaryItem
            label="Subtotal"
            value={formatCurrency(quote.subtotal)}
          />
          <SummaryItem label="Tax" value={formatCurrency(quote.taxTotal)} />
          <SummaryItem
            label="Total"
            value={formatCurrency(quote.total)}
            emphasize
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
          {quote.lines.length === 0 ? (
            <EmptyState
              title="No line items"
              description="Add items from the editor to see pricing breakdowns here."
              className="rounded-2xl border-border"
            />
          ) : (
            <>
              {/* Mobile view */}
              <div className="space-y-3 md:hidden">
                {quote.lines.map((line, index) => {
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
                              <span className="text-muted-foreground">Qty:</span> {line.quantity} {line.unit}
                            </span>
                            <span>
                              <span className="text-muted-foreground">Price:</span> {formatCurrency(line.unitPrice)}
                            </span>
                          </div>
                          {hasDiscount && (
                            <div className="text-sm text-muted-foreground">
                              Discount: {line.discountType === "PERCENTAGE" ? `${line.discountValue ?? 0}%` : formatCurrency(line.discountValue ?? 0)}
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-1 border-t border-border">
                            <span className="text-sm text-muted-foreground">Line total</span>
                            <span className="font-medium text-foreground">{formatCurrency(line.total)}</span>
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
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {quote.lines.map((line) => (
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
                      {formatCurrency(line.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {discountLabel(line.discountType, line.discountValue)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(line.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {(quote.notes || quote.terms) && (
        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardContent className="grid gap-6 md:grid-cols-2">
            {quote.notes ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
                  Notes
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {quote.notes}
                </p>
              </div>
            ) : null}
            {quote.terms ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
                  Terms
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {quote.terms}
                </p>
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
          declineMutation.mutate();
        }}
        onNoteChange={setDecisionNote}
        isLoading={declineMutation.isPending}
      />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-sm",
          emphasize ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </p>
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
  mode: "decline" | null;
  note: string;
  isLoading: boolean;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function DecisionDialog({
  mode,
  note,
  onNoteChange,
  onClose,
  onConfirm,
  isLoading,
}: DecisionDialogProps) {
  const title = mode === "decline" ? "Decline quote" : null;
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl border border-border bg-surface-overlay">
        {title ? (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add an internal note explaining why the quote was lost. The status will be
                updated automatically.
              </p>
              <Textarea
                rows={4}
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Reason for decline (optional)"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="gap-2 rounded-full"
              >
                Cancel
              </Button>
              <LoadingButton
                variant="destructive"
                onClick={onConfirm}
                loading={isLoading}
                loadingText="Declining…"
                className="gap-2 rounded-full"
              >
                Decline quote
              </LoadingButton>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
