"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { mutateJson, getJson } from "@/lib/http";
import { clientNoteSchema } from "@/lib/schemas/clients";
import { formatCurrency } from "@/lib/currency";
import type { SettingsPayload } from "@/components/settings/settings-form";

export type ClientDetailRecord = {
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    notes: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
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
};

interface ClientDetailProps {
  detail: ClientDetailRecord;
}

type NoteFormValues = {
  body: string;
};

export function ClientDetail({ detail }: ClientDetailProps) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["client", detail.client.id],
    queryFn: () =>
      getJson<ClientDetailRecord>(`/api/clients/${detail.client.id}`),
    initialData: detail,
    staleTime: 1000 * 30,
  });

  const current = data ?? detail;

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => getJson<SettingsPayload>("/api/settings"),
    staleTime: 1000 * 60,
  });

  const paymentTermDisplay = useMemo(() => {
    const settings = settingsQuery.data;
    const terms = settings?.paymentTerms ?? [];
    const resolveLabel = (code: string) => {
      const term = terms.find((item) => item.code === code);
      if (!term) {
        return code || "—";
      }
      if (term.days === 0) {
        return `${term.label} (due immediately)`;
      }
      return `${term.label} (${term.days} days)`;
    };

    if (current.client.paymentTerms) {
      return resolveLabel(current.client.paymentTerms);
    }

    if (settings?.defaultPaymentTerms) {
      return `${resolveLabel(settings.defaultPaymentTerms)} (default)`;
    }

    return "—";
  }, [current.client.paymentTerms, settingsQuery.data]);

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

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-900">
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                Name
              </p>
              <p className="text-zinc-900 font-medium">{current.client.name}</p>
              {current.client.company ? (
                <p className="text-xs text-zinc-500">
                  {current.client.company}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                Contact
              </p>
              <p>{current.client.email || "—"}</p>
              <p>{current.client.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                Address
              </p>
              <p className="whitespace-pre-wrap">
                {current.client.address || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
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
                    className="border-zinc-300/70 text-zinc-600"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
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
            <TabsList className="bg-white/80 backdrop-blur">
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices">
              <DataTable
                emptyMessage="No invoices yet."
                columns={["Invoice", "Status", "Total", "Balance", "Issued"]}
                rows={current.invoices.map((invoice) => [
                  <span
                    key={`inv-${invoice.id}`}
                    className="font-medium text-zinc-900"
                  >
                    {invoice.number}
                  </span>,
                  <Badge
                    key={`status-${invoice.id}`}
                    variant="outline"
                    className="border-zinc-300/70 text-zinc-600"
                  >
                    {invoice.status.toLowerCase()}
                  </Badge>,
                  formatCurrency(invoice.total),
                  formatCurrency(invoice.balanceDue),
                  new Date(invoice.issueDate).toLocaleDateString(),
                ])}
              />
            </TabsContent>
            <TabsContent value="quotes">
              <DataTable
                emptyMessage="No quotes recorded."
                columns={["Quote", "Status", "Total", "Issued"]}
                rows={current.quotes.map((quote) => [
                  <span
                    key={`quote-${quote.id}`}
                    className="font-medium text-zinc-900"
                  >
                    {quote.number}
                  </span>,
                  <Badge
                    key={`quote-status-${quote.id}`}
                    variant="outline"
                    className="border-zinc-300/70 text-zinc-600"
                  >
                    {quote.status.toLowerCase()}
                  </Badge>,
                  formatCurrency(quote.total),
                  new Date(quote.issueDate).toLocaleDateString(),
                ])}
              />
            </TabsContent>
            <TabsContent value="jobs">
              <DataTable
                emptyMessage="No jobs scheduled."
                columns={["Job", "Status", "Priority", "Created"]}
                rows={current.jobs.map((job) => [
                  <span
                    key={`job-${job.id}`}
                    className="font-medium text-zinc-900"
                  >
                    {job.title}
                  </span>,
                  <Badge
                    key={`job-status-${job.id}`}
                    variant="outline"
                    className="border-zinc-300/70 text-zinc-600"
                  >
                    {job.status.toLowerCase()}
                  </Badge>,
                  <Badge
                    key={`job-priority-${job.id}`}
                    variant="outline"
                    className="border-zinc-300/70 text-zinc-600"
                  >
                    {job.priority.toLowerCase()}
                  </Badge>,
                  new Date(job.createdAt).toLocaleString(),
                ])}
              />
            </TabsContent>
            <TabsContent value="activity">
              <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-zinc-500">
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {current.activity.length === 0 ? (
                    <p className="text-sm text-zinc-500">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {current.activity.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-zinc-200/70 bg-white/80 p-3 backdrop-blur"
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                            {entry.action}
                          </p>
                          <p className="text-sm text-zinc-700">
                            {entry.message}
                          </p>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
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
                      <FormField
                        control={noteForm.control}
                        name="body"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-zinc-600">
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
                      <Button type="submit" disabled={noteMutation.isPending}>
                        {noteMutation.isPending ? "Adding…" : "Add note"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-400">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      </CardContent>
    </Card>
  );
}

interface DataTableProps {
  columns: string[];
  rows: (string | number | ReactNode)[][];
  emptyMessage: string;
}

function DataTable({ columns, rows, emptyMessage }: DataTableProps) {
  return (
    <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
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
                  className="h-20 text-center text-sm text-zinc-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={index}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={`${index}-${cellIndex}`}>{cell}</TableCell>
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
