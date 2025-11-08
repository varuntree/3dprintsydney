"use client";

import { NavigationLink } from "@/components/ui/navigation-link";
import { ActionButton } from "@/components/ui/action-button";
import { usePaymentTerms } from "@/hooks/use-payment-terms";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  DataList,
  DataListBadge,
  DataListContent,
  DataListFooter,
  DataListHeader,
  DataListItem,
  DataListValue,
} from "@/components/ui/data-list";
import { mutateJson, getJson } from "@/lib/http";
import { getUserMessage } from "@/lib/errors/user-messages";
import { formatCurrency } from "@/lib/currency";
import { UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  clientFormResolver,
  defaultClientFormValues,
  PAYMENT_TERMS_INHERIT_VALUE,
  type ClientFormValues,
} from "./client-form-shared";

export type ClientSummaryRecord = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  paymentTerms?: string | null;
  notifyOnJobStatus: boolean;
  studentDiscountEligible: boolean;
  studentDiscountRate: number;
  outstandingBalance: number;
  totalInvoices: number;
  totalQuotes: number;
  createdAt: string;
};

interface ClientsViewProps {
  initialClients: ClientSummaryRecord[];
  startOpen?: boolean;
}

const queryKey = ["clients"] as const;

export function ClientsView({ initialClients, startOpen = false }: ClientsViewProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(startOpen);
  const hasAppliedStartOpen = useRef(false);
  const {
    terms: paymentTermOptions,
    defaultTermCode,
    isLoading: paymentTermsLoading,
    notificationsEnabledDefault,
  } = usePaymentTerms();

  const form = useForm<ClientFormValues>({
    resolver: clientFormResolver,
    defaultValues: defaultClientFormValues(),
  });

  const { data } = useQuery({
    queryKey,
    queryFn: () => getJson<ClientSummaryRecord[]>("/api/clients"),
    initialData: initialClients,
    staleTime: 1000 * 60,
  });


  const mutation = useMutation({
    mutationFn: (values: ClientFormValues) =>
      mutateJson<ClientSummaryRecord>("/api/clients", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Client added");
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  useEffect(() => {
    if (paymentTermsLoading) return;
    const currentTerm = form.getValues("paymentTerms");
    if (!currentTerm && defaultTermCode) {
      form.setValue("paymentTerms", defaultTermCode, { shouldDirty: false });
    }
  }, [paymentTermsLoading, defaultTermCode, form]);

  useEffect(() => {
    if (startOpen && !hasAppliedStartOpen.current) {
      form.reset({
        ...defaultClientFormValues(),
        paymentTerms: defaultTermCode,
        notifyOnJobStatus: notificationsEnabledDefault,
      });
      setOpen(true);
      hasAppliedStartOpen.current = true;
    }

    if (!startOpen) {
      hasAppliedStartOpen.current = false;
    }
  }, [startOpen, form, defaultTermCode, notificationsEnabledDefault]);

  function openDialog() {
    form.reset({
      ...defaultClientFormValues(),
      paymentTerms: defaultTermCode,
      notifyOnJobStatus: notificationsEnabledDefault,
    });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
  }

  const clients = (data ?? []).map((client) => ({
    ...client,
    notifyOnJobStatus: client.notifyOnJobStatus ?? false,
  }));

  const totalOutstanding = clients.reduce(
    (sum, client) => sum + client.outstandingBalance,
    0,
  );

  return (
    <>
      <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Clients
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage contact information, payment terms, and document history in one place.
            </p>
          </div>
          <ActionButton
            onClick={openDialog}
            className="w-full rounded-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>New Client</span>
          </ActionButton>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 sm:mt-6">
          <span>{clients.length} active</span>
          <span>{formatCurrency(totalOutstanding)} outstanding</span>
        </div>
      </header>

      <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Client Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <EmptyState
              title="No clients yet"
              description="Add a client to start sending quotes and invoices."
              actions={
                <Button onClick={openDialog} className="gap-2 rounded-full">
                  <UserPlus className="h-4 w-4" /> Add client
                </Button>
              }
              className="rounded-2xl border-border"
            />
          ) : (
            <>
              <DataList className="md:hidden">
                {clients.map((client) => (
                  <DataListItem key={client.id}>
                    <DataListHeader>
                      <div className="space-y-1">
                        <NavigationLink
                          href={`/clients/${client.id}`}
                          className="text-base font-semibold text-foreground hover:underline"
                        >
                          {client.name}
                        </NavigationLink>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(client.createdAt).toLocaleDateString()}
                        </p>
                        {client.company ? (
                          <p className="text-sm text-muted-foreground/90">{client.company}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Outstanding
                        </p>
                        <DataListValue>
                          {formatCurrency(client.outstandingBalance)}
                        </DataListValue>
                      </div>
                    </DataListHeader>
                    <DataListContent>
                      {client.studentDiscountEligible ? (
                        <Badge className="w-fit border-emerald-200 bg-emerald-50 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          Student {client.studentDiscountRate}% off
                        </Badge>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {client.notifyOnJobStatus
                          ? "Job status emails enabled"
                          : "Notifications disabled"}
                      </p>
                    </DataListContent>
                    <DataListFooter>
                      <span>{client.email || "No email"}</span>
                      <DataListBadge>
                        {client.totalInvoices} invoices · {client.totalQuotes} quotes
                      </DataListBadge>
                    </DataListFooter>
                  </DataListItem>
                ))}
              </DataList>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead className="text-right">Docs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow
                        key={client.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <NavigationLink
                              href={`/clients/${client.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {client.name}
                            </NavigationLink>
                            <span className="text-xs text-muted-foreground/80">
                              Created {new Date(client.createdAt).toLocaleDateString()}
                            </span>
                            {client.studentDiscountEligible ? (
                              <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
                                Student {client.studentDiscountRate}% off
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.company || (
                            <span className="text-xs text-muted-foreground/80">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.email || (
                            <span className="text-xs text-muted-foreground/80">—</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(client.outstandingBalance)}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className="border-border text-muted-foreground"
                          >
                            {client.totalInvoices} invoices · {client.totalQuotes} quotes
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => (!next ? closeDialog() : setOpen(true))}
      >
        <DialogContent className="w-[min(100vw-2rem,640px)] max-w-2xl rounded-3xl border border-border bg-surface-overlay shadow-sm shadow-black/5 sm:w-auto">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              className="space-y-4"
            >
              {mutation.isPending ? (
                <div className="flex justify-start">
                  <InlineLoader label="Creating client…" className="text-sm" />
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Street, City, State"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
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
                        {paymentTermOptions.map((term) => (
                          <SelectItem key={term.code} value={term.code}>
                            {term.label}{" "}
                            {term.days === 0
                              ? "(due immediately)"
                              : `(${term.days} days)`}
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
                control={form.control}
                name="notifyOnJobStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium">Job status emails</FormLabel>
                      <FormDescription>
                        Send automated job status updates to this client when enabled globally.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Project background, preferences"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={mutation.isPending}
                  className="gap-2 rounded-full"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  loading={mutation.isPending}
                  loadingText="Creating client…"
                  className="gap-2 rounded-full"
                >
                  Create client
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
