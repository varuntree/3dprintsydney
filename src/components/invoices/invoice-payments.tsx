"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/currency";
import { paymentInputSchema, type PaymentInput } from "@/lib/schemas/invoices";
import { mutateJson } from "@/lib/http";
import { getUserMessage } from "@/lib/errors/user-messages";

export type InvoicePaymentRecord = {
  id: number;
  amount: number;
  method: "STRIPE" | "BANK_TRANSFER" | "CASH" | "OTHER";
  reference: string;
  notes: string;
  paidAt: string;
};

interface InvoicePaymentsProps {
  invoiceId: number;
  payments: InvoicePaymentRecord[];
}

type PaymentFormValues = {
  amount: number;
  method: PaymentInput["method"];
  reference?: string;
  processor?: string;
  processorId?: string;
  notes?: string;
  paidAt?: string;
};

export function InvoicePayments({ invoiceId, payments }: InvoicePaymentsProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [entries, setEntries] = useState<InvoicePaymentRecord[]>(payments);

  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function normalizePayment(payment: PaymentInput & { id: number; paid_at?: string; method: string }) {
    const paidAtIso = payment.paid_at ?? payment.paidAt ?? new Date().toISOString();
    return {
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method as InvoicePaymentRecord["method"],
      reference: payment.reference ?? "",
      notes: payment.notes ?? "",
      paidAt: new Date(paidAtIso).toISOString(),
    } satisfies InvoicePaymentRecord;
  }

  const resolver = zodResolver(
    paymentInputSchema,
  ) as Resolver<PaymentFormValues>;

  const form = useForm<PaymentFormValues>({
    resolver,
    defaultValues: {
      amount: 0.01,
      method: "OTHER",
      reference: "",
      processor: "",
      processorId: "",
      notes: "",
      paidAt: defaultDate,
    },
  });

  const addMutation = useMutation({
    mutationFn: (values: PaymentFormValues) => {
      const roundedAmount = Number((Math.round(values.amount * 100) / 100).toFixed(2));
      const payload: PaymentInput = {
        amount: roundedAmount,
        method: values.method,
        reference: values.reference ?? "",
        processor: values.processor ?? "",
        processorId: values.processorId ?? "",
        notes: values.notes ?? "",
        paidAt: values.paidAt,
      };
      return mutateJson(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (created) => {
      toast.success("Payment added");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (created) {
        const mapped = normalizePayment(created as PaymentInput & { id: number; paid_at?: string; method: string });
        setEntries((prev) => [...prev, mapped]);
      }
      form.reset({
        amount: 0.01,
        method: "OTHER",
        reference: "",
        processor: "",
        processorId: "",
        notes: "",
        paidAt: defaultDate,
      });
      setIsAdding(false);
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) =>
      mutateJson(`/api/invoices/${invoiceId}/payments/${paymentId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      toast.success("Payment removed");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setEntries((prev) => prev.filter((payment) => payment.id !== variables));
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  return (
    <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-zinc-900">
          Payments
        </CardTitle>
        <Button variant="outline" onClick={() => setIsAdding((prev) => !prev)}>
          {isAdding ? "Cancel" : "New payment"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.paidAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{payment.method.toLowerCase()}</TableCell>
                  <TableCell>{payment.reference || "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      className="text-red-500"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(payment.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {isAdding ? (
          <Form {...form}>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) =>
                addMutation.mutate(values),
              )}
            >
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0.01}
                        inputMode="decimal"
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onBlur={(event) => {
                          const value = event.target.valueAsNumber;
                          if (Number.isFinite(value)) {
                            const rounded = Number((Math.round(value * 100) / 100).toFixed(2));
                            field.onChange(rounded);
                          }
                        }}
                        onChange={(event) =>
                          field.onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">
                          Bank transfer
                        </SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                        <SelectItem value="STRIPE">Stripe</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Reference" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding…" : "Add payment"}
                </Button>
              </div>
            </form>
          </Form>
        ) : null}
      </CardContent>
    </Card>
  );
}
