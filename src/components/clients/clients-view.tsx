"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { clientInputSchema } from "@/lib/schemas/clients";
import { formatCurrency } from "@/lib/currency";
import { UserPlus } from "lucide-react";

export type ClientSummaryRecord = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  outstandingBalance: number;
  totalInvoices: number;
  totalQuotes: number;
  createdAt: string;
};

interface ClientsViewProps {
  initialClients: ClientSummaryRecord[];
  startOpen?: boolean;
}

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

const queryKey = ["clients"] as const;
const clientResolver = zodResolver(
  clientInputSchema,
) as Resolver<ClientFormValues>;

function defaults(): ClientFormValues {
  return {
    name: "",
    company: "",
    abn: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "",
    notes: "",
    tags: [],
  };
}

export function ClientsView({ initialClients, startOpen = false }: ClientsViewProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(startOpen);
  const hasAppliedStartOpen = useRef(false);

  const form = useForm<ClientFormValues>({
    resolver: clientResolver,
    defaultValues: defaults(),
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
      toast.error(
        error instanceof Error ? error.message : "Failed to add client",
      );
    },
  });

  useEffect(() => {
    if (startOpen && !hasAppliedStartOpen.current) {
      form.reset(defaults());
      setOpen(true);
      hasAppliedStartOpen.current = true;
    }

    if (!startOpen) {
      hasAppliedStartOpen.current = false;
    }
  }, [startOpen, form]);

  function openDialog() {
    form.reset(defaults());
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
  }

  const clients = data ?? [];

  const totalOutstanding = clients.reduce(
    (sum, client) => sum + client.outstandingBalance,
    0,
  );

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Clients</h2>
          <p className="text-sm text-zinc-500">
            Manage contact information, payment terms, and document history in
            one place.
          </p>
        </div>
        <Button onClick={openDialog} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          New Client
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-400">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-zinc-900">
              {clients.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-400">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-zinc-900">
              {formatCurrency(totalOutstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">
            Client Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-sm text-zinc-500"
                  >
                    No clients yet. Add your first client to begin quoting and
                    invoicing.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-white/80">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {client.name}
                        </Link>
                        <span className="text-xs text-zinc-400">
                          Created{" "}
                          {new Date(client.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.company || (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.email || (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(client.outstandingBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className="border-zinc-300/70 text-zinc-600"
                      >
                        {client.totalInvoices} invoices · {client.totalQuotes}{" "}
                        quotes
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => (!next ? closeDialog() : setOpen(true))}
      >
        <DialogContent className="max-w-2xl border border-zinc-200/70 bg-white/80 backdrop-blur">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              className="space-y-4"
            >
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
                    <FormControl>
                      <Input placeholder="Due on receipt" {...field} />
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : "Create client"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
