"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionButton } from "@/components/ui/action-button";
import { mutateJson, getJson } from "@/lib/http";
import { clientNoteSchema, clientInputSchema } from "@/lib/schemas/clients";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { ActionButtonGroup, ActionGroupContainer } from "@/components/ui/action-button-group";
import { usePaymentTerms, findPaymentTermLabel } from "@/hooks/use-payment-terms";
import { useNavigation } from "@/hooks/useNavigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Mail, Phone, Edit, FileText, Receipt, Wallet, DollarSign, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddCreditModal } from "@/components/clients/add-credit-modal";
import { getUserMessage } from "@/lib/errors/user-messages";

export type ClientDetailRecord = {
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    abn: string | null;
    notes: string;
    tags: string[];
    walletBalance: number;
    createdAt: string;
    updatedAt: string;
    studentDiscountEligible: boolean;
    studentDiscountRate: number;
  };
  invoices: {
    id: number;
    number: string;
    status: string;
    total: number;
    balanceDue: number;
    issueDate: string;
  }[];
  quotes: {
    id: number;
    number: string;
    status: string;
    total: number;
    issueDate: string;
  }[];
  jobs: {
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }[];
  activity: {
    id: number;
    action: string;
    message: string;
    createdAt: string;
    context?: string;
  }[];
  totals: {
    outstanding: number;
    paid: number;
    queuedJobs: number;
  };
  clientUser?: {
    id: number;
    email: string;
    createdAt: string;
    messageCount: number;
  } | null;
};

interface ClientDetailProps {
  detail: ClientDetailRecord;
}

type NoteFormValues = {
  body: string;
};

type ClientFormValues = {
  name: string;
  company?: string;
  abn?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  tags?: string[];
};

const PAYMENT_TERMS_INHERIT_VALUE = "__inherit_payment_terms__";
const clientFormResolver = zodResolver(clientInputSchema) as Resolver<ClientFormValues>;

export function ClientDetail({ detail }: ClientDetailProps) {
  const queryClient = useQueryClient();
  const { navigate } = useNavigation();

  const { data } = useQuery({
    queryKey: ["client", detail.client.id],
    queryFn: () =>
      getJson<ClientDetailRecord>(`/api/clients/${detail.client.id}`),
    initialData: detail,
    staleTime: 1000 * 30,
  });

  const current = data ?? detail;
  const clientCode = current.client.id.toString().padStart(5, "0");

  const {
    terms: paymentTerms,
    defaultTermCode,
    isLoading: paymentTermsLoading,
  } = usePaymentTerms();

  const paymentTermDisplay = useMemo(() => {
    const explicitTerm = findPaymentTermLabel(paymentTerms, current.client.paymentTerms);
    if (explicitTerm) {
      return formatPaymentTerm(explicitTerm);
    }

    const fallback = findPaymentTermLabel(paymentTerms, defaultTermCode);
    if (fallback) {
      const base = formatPaymentTerm(fallback);
      return defaultTermCode ? `${base} (default)` : base;
    }

    return current.client.paymentTerms || defaultTermCode || "—";
  }, [paymentTerms, current.client.paymentTerms, defaultTermCode]);

  const [editOpen, setEditOpen] = useState(false);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);

  const initialFormValues = useMemo(
    () => toFormValues(current.client),
    [current.client],
  );

  const editForm = useForm<ClientFormValues>({
    resolver: clientFormResolver,
    defaultValues: initialFormValues,
  });

  useEffect(() => {
    if (!editOpen) {
      editForm.reset(toFormValues(current.client));
    }
  }, [current.client, editForm, editOpen]);

  useEffect(() => {
    if (editOpen) {
      editForm.reset(toFormValues(current.client));
    }
  }, [editOpen, current.client, editForm]);

  useEffect(() => {
    if (paymentTermsLoading || !editOpen) return;
    const currentTerm = editForm.getValues("paymentTerms");
    if (!currentTerm && defaultTermCode) {
      editForm.setValue("paymentTerms", defaultTermCode, { shouldDirty: false });
    }
  }, [paymentTermsLoading, defaultTermCode, editOpen, editForm]);

  const editMutation = useMutation({
    mutationFn: (values: ClientFormValues) =>
      mutateJson(`/api/clients/${current.client.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      toast.success("Client updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client", current.client.id] }),
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
      ]);
      setEditOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(clientNoteSchema),
    defaultValues: { body: "" },
  });

  const noteMutation = useMutation({
    mutationFn: (values: NoteFormValues) =>
      mutateJson(`/api/clients/${current.client.id}/notes`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      noteForm.reset({ body: "" });
      queryClient.invalidateQueries({
        queryKey: ["client", current.client.id],
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const contactMeta = (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {current.client.email ? (
        <span className="flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {current.client.email}
        </span>
      ) : null}
      {current.client.phone ? (
        <span className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {current.client.phone}
        </span>
      ) : null}
      {current.client.studentDiscountEligible ? (
        <span className="flex items-center gap-1 text-emerald-600">
          <GraduationCap className="h-3 w-3" />
          {current.client.studentDiscountRate}% student discount
        </span>
      ) : null}
      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
        Outstanding {formatCurrency(current.totals.outstanding)}
      </span>
    </div>
  );

  const tagChips = current.client.tags.length ? (
    <div className="flex flex-wrap gap-2">
      {current.client.tags.map((tag) => (
        <Badge key={tag} variant="outline" className="border-border text-xs uppercase tracking-wide text-muted-foreground">
          {tag}
        </Badge>
      ))}
    </div>
  ) : null;

  const onEditSubmit = editForm.handleSubmit((values) =>
    editMutation.mutate({ ...values, tags: current.client.tags }),
  );

  return (
    <>
      <div className="space-y-6">
      <PageHeader
        kicker={
          <div className="flex items-center gap-2">
            <StatusBadge status="active" size="sm" />
            <Badge
              variant="outline"
              className="border-transparent bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-primary-foreground"
            >
              {`Client ${clientCode}`}
            </Badge>
          </div>
        }
        title={current.client.name}
        description={current.client.company ? (
          <span className="text-sm text-muted-foreground">{current.client.company}</span>
        ) : undefined}
        meta={contactMeta}
        actions={
          <ActionGroupContainer>
            <ActionButtonGroup title="Actions" variant="primary">
              <ActionButton
                href={`/quotes/new?clientId=${current.client.id}`}
                className="rounded-full"
              >
                <FileText className="h-4 w-4" />
                <span>New Quote</span>
              </ActionButton>
              <ActionButton
                href={`/invoices/new?clientId=${current.client.id}`}
                variant="outline"
                className="rounded-full"
              >
                <Receipt className="h-4 w-4" />
                <span>New Invoice</span>
              </ActionButton>
            </ActionButtonGroup>

            <ActionButtonGroup title="Manage" variant="secondary">
              <ActionButton
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setShowAddCreditModal(true)}
              >
                <Wallet className="h-4 w-4" />
                <span>Add Credit</span>
              </ActionButton>
              <ActionButton
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setEditOpen(true)}
                disabled={editMutation.isPending}
              >
                <Edit className="h-4 w-4" />
                <span>Edit Details</span>
              </ActionButton>
            </ActionButtonGroup>
          </ActionGroupContainer>
        }
      >
        {tagChips}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Name
              </p>
              <p className="text-foreground font-medium">{current.client.name}</p>
              {current.client.company ? (
                <p className="text-xs text-muted-foreground">
                  {current.client.company}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Contact
              </p>
              <p>{current.client.email || "—"}</p>
              <p>{current.client.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Address
              </p>
              <p className="whitespace-pre-wrap">
                {current.client.address || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Payment Terms
              </p>
              <p>{paymentTermDisplay}</p>
            </div>
            {current.client.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {current.client.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-border text-muted-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Wallet Balance"
              value={formatCurrency(current.client.walletBalance)}
              icon={<DollarSign className="h-4 w-4 text-green-600" />}
              highlight
            />
            <SummaryCard
              label="Outstanding"
              value={formatCurrency(current.totals.outstanding)}
            />
            <SummaryCard
              label="Paid"
              value={formatCurrency(current.totals.paid)}
            />
            <SummaryCard
              label="Jobs Queued"
              value={String(current.totals.queuedJobs)}
            />
          </div>

          <Tabs defaultValue="invoices" className="space-y-4">
            <TabsList className="flex flex-wrap gap-2 rounded-3xl border border-border bg-surface-overlay p-1">
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices">
              <DataTable
                emptyMessage="No invoices yet."
                columns={["Invoice", "Status", "Total", "Balance", "Issued"]}
                rows={current.invoices.map((invoice) => ({
                  key: `inv-${invoice.id}`,
                  href: `/invoices/${invoice.id}`,
                  cells: [
                    <span key={`inv-code-${invoice.id}`} className="font-medium text-foreground">
                      {invoice.number}
                    </span>,
                    <StatusBadge key={`inv-status-${invoice.id}`} status={invoice.status} size="sm" />,
                    formatCurrency(invoice.total),
                    formatCurrency(invoice.balanceDue),
                    formatDate(invoice.issueDate),
                  ],
                }))}
              />
            </TabsContent>
            <TabsContent value="quotes">
              <DataTable
                emptyMessage="No quotes recorded."
                columns={["Quote", "Status", "Total", "Issued"]}
                rows={current.quotes.map((quote) => ({
                  key: `quote-${quote.id}`,
                  href: `/quotes/${quote.id}`,
                  cells: [
                    <span key={`quote-code-${quote.id}`} className="font-medium text-foreground">
                      {quote.number}
                    </span>,
                    <StatusBadge key={`quote-status-${quote.id}`} status={quote.status} size="sm" />,
                    formatCurrency(quote.total),
                    formatDate(quote.issueDate),
                  ],
                }))}
              />
            </TabsContent>
            <TabsContent value="jobs">
              <DataTable
                emptyMessage="No jobs scheduled."
                columns={["Job", "Status", "Priority", "Created"]}
                rows={current.jobs.map((job) => ({
                  key: `job-${job.id}`,
                  cells: [
                    <span key={`job-${job.id}`} className="font-medium text-foreground">
                      {job.title}
                    </span>,
                    <Badge
                      key={`job-status-${job.id}`}
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      {job.status.toLowerCase()}
                    </Badge>,
                    <Badge
                      key={`job-priority-${job.id}`}
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      {job.priority.toLowerCase()}
                    </Badge>,
                    formatDate(job.createdAt, "d MMM yyyy HH:mm"),
                  ],
                }))}
              />
            </TabsContent>
            <TabsContent value="activity">
              <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {current.activity.length === 0 ? (
                    <EmptyState
                      title="No activity yet"
                      description="Notes, invoices, and quotes for this client will appear here."
                      className="rounded-2xl border-border"
                    />
                  ) : (
                    <div className="space-y-3">
                      {current.activity.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-border bg-surface-overlay p-3"
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                            {entry.action}
                          </p>
                          <p className="text-sm text-foreground">
                            {entry.message}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                            <span>
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                            {entry.context ? (
                              <span>{entry.context}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Form {...noteForm}>
                    <form
                      onSubmit={noteForm.handleSubmit((values) =>
                        noteMutation.mutate(values),
                      )}
                      className="space-y-2"
                    >
                      {noteMutation.isPending ? (
                        <div className="flex justify-start">
                          <InlineLoader label="Saving note…" className="text-xs" />
                        </div>
                      ) : null}
                      <FormField
                        control={noteForm.control}
                        name="body"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-muted-foreground">
                              Add internal note
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                rows={3}
                                placeholder="Add reminder or context"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <LoadingButton
                        type="submit"
                        loading={noteMutation.isPending}
                        loadingText="Saving note…"
                        className="gap-2"
                      >
                        Add note
                      </LoadingButton>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
      </div>

      {/* Danger Zone */}
      {current.clientUser ? (
        <Card className="rounded-3xl border border-red-300/40 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-red-700 dark:text-red-300">
              Deleting the client portal user removes the client and ALL associated data (messages, invoices, quotes, jobs, payments, files, and activity). This cannot be undone.
            </p>
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!current.clientUser) return;
                  const ok = confirm(
                    "Delete the client portal user and ALL client data? This cannot be undone.",
                  );
                  if (!ok) return;
                  const res = await fetch(`/api/admin/users/${current.clientUser.id}`, { method: "DELETE" });
                  if (res.ok) {
                    toast.success("Client and portal user deleted");
                    await navigate("/clients", { replace: true });
                  } else {
                    const j = await res.json().catch(() => ({ error: "Unknown error" }));
                    toast.error(j?.error ?? "Failed to delete client portal user");
                  }
                }}
              >
                Delete Client Portal User + All Client Data
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          if (!next) {
            setEditOpen(false);
          } else {
            setEditOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl border border-border bg-surface-overlay shadow-sm shadow-black/5">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={onEditSubmit} className="space-y-4">
              {editMutation.isPending ? (
                <div className="flex justify-start">
                  <InlineLoader label="Saving client…" className="text-sm" />
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={editForm.control}
                  name="abn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ABN</FormLabel>
                      <FormControl>
                        <Input placeholder="00 000 000 000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+61" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Street, City, State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment terms</FormLabel>
                    <Select
                      value={
                        field.value && field.value.trim().length > 0
                          ? field.value
                          : PAYMENT_TERMS_INHERIT_VALUE
                      }
                      onValueChange={(value) =>
                        field.onChange(
                          value === PAYMENT_TERMS_INHERIT_VALUE ? "" : value,
                        )
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PAYMENT_TERMS_INHERIT_VALUE}>
                          Use settings default
                        </SelectItem>
                        {paymentTerms.map((term) => (
                          <SelectItem key={term.code} value={term.code}>
                            {term.label}{" "}
                            {term.days === 0 ? "(due immediately)" : `(${term.days} days)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {paymentTermsLoading ? (
                      <InlineLoader label="Loading payment terms…" className="text-xs" />
                    ) : null}
                    <FormDescription>
                      Manage options in Settings → Payments.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Project background, preferences" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editMutation.isPending}
                  className="gap-2 rounded-full"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  loading={editMutation.isPending}
                  loadingText="Saving client…"
                  className="gap-2 rounded-full"
                >
                  Save changes
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AddCreditModal
        clientId={current.client.id}
        clientName={current.client.name}
        currentBalance={current.client.walletBalance}
        open={showAddCreditModal}
        onOpenChange={setShowAddCreditModal}
      />
    </>
  );
}

function toFormValues(client: ClientDetailRecord["client"]): ClientFormValues {
  return {
    name: client.name ?? "",
    company: client.company ?? "",
    abn: client.abn ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    paymentTerms: client.paymentTerms ?? "",
    notes: client.notes ?? "",
    tags: client.tags ?? [],
  };
}

function formatPaymentTerm(term: { label: string; days: number }): string {
  if (!term) return "—";
  return term.days === 0
    ? `${term.label} (due immediately)`
    : `${term.label} (${term.days} days)`;
}

function SummaryCard({
  label,
  value,
  icon,
  highlight
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(
      "rounded-3xl border border-border bg-surface-overlay shadow-sm",
      highlight && "border-green-200/50 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/20"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground/80">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-semibold text-foreground",
          highlight && "text-green-700 dark:text-green-400"
        )}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

interface DataTableRow {
  key: string;
  href?: string;
  cells: (string | number | ReactNode)[];
}

interface DataTableProps {
  columns: string[];
  rows: DataTableRow[];
  emptyMessage: string;
}

function DataTable({ columns, rows, emptyMessage }: DataTableProps) {
  const { navigate } = useNavigation();

  const handleRowClick = (href?: string) => {
    if (!href) return;
    void navigate(href);
  };

  return (
    <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-20 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.key}
                  role={row.href ? "button" : undefined}
                  tabIndex={row.href ? 0 : undefined}
                  onClick={row.href ? () => handleRowClick(row.href) : undefined}
                  onKeyDown={row.href ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowClick(row.href);
                    }
                  } : undefined}
                  className={cn(
                    row.href
                      ? "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                      : "hover:bg-muted/20",
                  )}
                >
                  {row.cells.map((cell, cellIndex) => (
                    <TableCell key={`${row.key}-${cellIndex}`}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
