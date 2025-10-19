"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import type { ProductTemplateDTO } from "@/server/services/product-templates";
import {
  CalculatorDialog,
  type CalculatorMaterialOption,
} from "@/components/quotes/quote-editor";
import {
  invoiceInputSchema,
  type InvoiceInput,
  type InvoiceLineInput,
} from "@/lib/schemas/invoices";
import { discountTypeValues } from "@/lib/schemas/quotes";
import {
  calculateLineTotal,
  calculateDocumentTotals,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import type { SettingsInput } from "@/lib/schemas/settings";
import type { ClientSummaryRecord } from "@/components/clients/clients-view";
import { mutateJson } from "@/lib/http";
import { useNavigation } from "@/hooks/useNavigation";
import { ClientPickerDialog } from "@/components/ui/client-picker-dialog";

const NO_SHIPPING_OPTION_VALUE = "__no_shipping__";
const MANUAL_TEMPLATE_OPTION_VALUE = "__manual_entry__";

interface InvoiceEditorProps {
  mode: "create" | "edit";
  invoiceId?: number;
  initialValues?: InvoiceFormValues;
  clients: ClientSummaryRecord[];
  settings: SettingsInput;
  templates: ProductTemplateDTO[];
  materials: CalculatorMaterialOption[];
}

export type InvoiceLineFormValue = {
  productTemplateId?: number | null;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountType: (typeof discountTypeValues)[number];
  discountValue?: number;
  calculatorBreakdown?: Record<string, unknown>;
};

export type InvoiceFormValues = {
  clientId: number;
  issueDate?: string;
  dueDate?: string;
  taxRate?: number;
  discountType: (typeof discountTypeValues)[number];
  discountValue?: number;
  shippingCost?: number;
  shippingLabel?: string;
  poNumber?: string;
  notes?: string;
  terms?: string;
  lines: InvoiceLineFormValue[];
};

export function InvoiceEditor({
  mode,
  invoiceId,
  initialValues,
  clients,
  settings,
  templates,
  materials,
}: InvoiceEditorProps) {
  const router = useRouter();
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const shippingRegions = settings.shippingRegions ?? [];
  const defaultShippingRegion =
    shippingRegions.find(
      (region) => region.code === settings.defaultShippingRegion,
    ) ?? shippingRegions[0] ?? null;

  const defaults: InvoiceFormValues = initialValues ?? {
    clientId: clients[0]?.id ?? 0,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: undefined,
    taxRate: settings.taxRate ?? 0,
    discountType: "NONE",
    discountValue: 0,
    shippingCost: defaultShippingRegion?.baseAmount ?? 0,
    shippingLabel: defaultShippingRegion?.label ?? "",
    poNumber: "",
    notes: "",
    terms: "",
    lines: [
      {
        name: "Line item",
        description: "",
        quantity: 1,
        unit: "unit",
        unitPrice: 0,
        discountType: "NONE",
        discountValue: 0,
        productTemplateId: null,
      },
    ],
  };

  const resolver = zodResolver(
    invoiceInputSchema,
  ) as Resolver<InvoiceFormValues>;

  const form = useForm<InvoiceFormValues>({
    resolver,
    defaultValues: defaults,
    mode: "onChange",
  });

  const [dueDateTouched, setDueDateTouched] = useState(
    Boolean(initialValues?.dueDate),
  );

  const paymentTermOptions = useMemo(
    () => settings.paymentTerms ?? [],
    [settings.paymentTerms],
  );
  const defaultPaymentTermCode = settings.defaultPaymentTerms;
  const watchedClientId = form.watch("clientId");
  const watchedIssueDate = form.watch("issueDate");

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === watchedClientId) ?? null;
  }, [clients, watchedClientId]);

  const resolvedPaymentTerm = useMemo(() => {
    if (paymentTermOptions.length === 0) {
      return null;
    }
    const clientCode = selectedClient?.paymentTerms ?? null;
    const targetCode =
      clientCode && clientCode.trim().length > 0
        ? clientCode
        : defaultPaymentTermCode;
    const match = paymentTermOptions.find((term) => term.code === targetCode);
    if (match) {
      return match;
    }
    const fallback = paymentTermOptions.find(
      (term) => term.code === defaultPaymentTermCode,
    );
    return fallback ?? paymentTermOptions[0];
  }, [
    defaultPaymentTermCode,
    paymentTermOptions,
    selectedClient?.paymentTerms,
  ]);

  const computedDueDate = useMemo(() => {
    if (!resolvedPaymentTerm) {
      return null;
    }
    const baseDate = watchedIssueDate
      ? new Date(`${watchedIssueDate}T12:00:00`)
      : (() => {
          const now = new Date();
          return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            12,
            0,
            0,
            0,
          );
        })();
    const computed =
      resolvedPaymentTerm.days > 0
        ? addDays(baseDate, resolvedPaymentTerm.days)
        : baseDate;
    return computed.toISOString().slice(0, 10);
  }, [resolvedPaymentTerm, watchedIssueDate]);

  const paymentTermDisplay = useMemo(() => {
    if (!resolvedPaymentTerm) {
      return "COD • Due immediately";
    }
    const descriptor =
      resolvedPaymentTerm.days === 0
        ? "Due immediately"
        : `Due ${resolvedPaymentTerm.days} day${
            resolvedPaymentTerm.days === 1 ? "" : "s"
          } after issue`;
    return `${resolvedPaymentTerm.label} • ${descriptor}`;
  }, [resolvedPaymentTerm]);

  const paymentTermSourceLabel = resolvedPaymentTerm
    ? selectedClient?.paymentTerms
      ? "Client default"
      : "Settings default"
    : "Fallback";

  useEffect(() => {
    if (initialValues) {
      form.reset({
        ...initialValues,
        terms: initialValues.terms ?? "",
        discountValue: initialValues.discountValue ?? 0,
        shippingCost: initialValues.shippingCost ?? 0,
        poNumber: initialValues.poNumber ?? "",
        lines: initialValues.lines.map((line) => ({
          ...line,
          discountValue: line.discountValue ?? 0,
          productTemplateId: line.productTemplateId ?? null,
        })),
      });
      setDueDateTouched(Boolean(initialValues.dueDate));
    } else {
      setDueDateTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  useEffect(() => {
    if (!dueDateTouched && computedDueDate) {
      form.setValue("dueDate", computedDueDate, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [computedDueDate, dueDateTouched, form]);

  const linesFieldArray = useFieldArray({
    name: "lines",
    control: form.control,
  });

  // Recompute totals whenever form values change (reactive like the quote editor)
  const watched = form.watch();
  const totals = useInvoiceTotals(watched, settings);

  const mutation = useMutation<{ id: number }, Error, InvoiceFormValues>({
    mutationFn: async (values: InvoiceFormValues) => {
      const payload: InvoiceInput = {
        ...values,
        dueDate: values.dueDate || undefined,
        discountValue: values.discountValue ?? 0,
        shippingCost: values.shippingCost ?? 0,
        lines: values.lines.map((line, index) => ({
          ...line,
          productTemplateId: line.productTemplateId ?? undefined,
          discountValue: line.discountValue ?? 0,
          orderIndex: index,
        })),
      };
      const trimmedPo = values.poNumber?.trim();
      payload.poNumber = trimmedPo ? trimmedPo : undefined;
      if (mode === "create") {
        return mutateJson<{ id: number }>("/api/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      return mutateJson<{ id: number }>(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (result) => {
      toast.success(`Invoice ${mode === "create" ? "created" : "updated"}`);
      const targetId = invoiceId ?? result.id;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        invoiceId
          ? queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] })
          : Promise.resolve(),
      ]);
      await navigate(`/invoices/${targetId}`, { replace: true });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save invoice",
      );
    },
  });

  const normalizeNumber = (value: number) => (Number.isNaN(value) ? 0 : value);
  const [calculator, setCalculator] = useState<{
    index: number;
    templateId: number;
  } | null>(null);
  const shippingLabel = form.watch("shippingLabel");

  useEffect(() => {
    if (!shippingLabel) return;
    const match =
      shippingRegions.find((region) => region.label === shippingLabel) ??
      shippingRegions.find((region) => region.code === shippingLabel);
    if (match) {
      const current = form.getValues("shippingCost") ?? 0;
      if (current === 0 || current === match.baseAmount) {
        form.setValue("shippingCost", match.baseAmount);
      }
      if (shippingLabel !== match.label) {
        form.setValue("shippingLabel", match.label, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingLabel, shippingRegions]);

  function addLine() {
    linesFieldArray.append({
      name: "Line item",
      description: "",
      quantity: 1,
      unit: "unit",
      unitPrice: 0,
      discountType: "NONE",
      discountValue: 0,
      productTemplateId: null,
    });
  }

  function useInvoiceTotals(
    values: InvoiceFormValues,
    settings: SettingsInput,
  ) {
    const lines = values.lines ?? [];
    const lineTotals = lines.map((line) =>
      calculateLineTotal({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountType: line.discountType,
        discountValue: line.discountValue ?? 0,
      }),
    );

    const { subtotal, total, tax, discounted } = calculateDocumentTotals({
      lines: lineTotals.map((total) => ({ total })),
      discountType: values.discountType,
      discountValue: values.discountValue ?? 0,
      shippingCost: values.shippingCost ?? 0,
      taxRate: values.taxRate ?? settings.taxRate ?? 0,
    });

    return {
      subtotal,
      discounted,
      tax,
      total,
      shippingCost: values.shippingCost ?? 0,
    };
  }

  function removeLine(index: number) {
    linesFieldArray.remove(index);
  }

  function applyTemplate(lineIndex: number, templateId: number | null) {
    const template = templates.find((item) => item.id === (templateId ?? 0));
    if (!template) {
      form.setValue(`lines.${lineIndex}.productTemplateId`, null);
      return;
    }

    form.setValue(`lines.${lineIndex}.productTemplateId`, template.id);
    form.setValue(`lines.${lineIndex}.name`, template.name);
    form.setValue(`lines.${lineIndex}.description`, template.description ?? "");
    form.setValue(`lines.${lineIndex}.unit`, template.unit ?? "unit");

    if (template.pricingType === "FIXED") {
      form.setValue(`lines.${lineIndex}.unitPrice`, template.basePrice ?? 0);
      form.setValue(`lines.${lineIndex}.quantity`, 1);
      form.setValue(`lines.${lineIndex}.discountType`, "NONE");
      form.setValue(`lines.${lineIndex}.discountValue`, 0);
      form.setValue(`lines.${lineIndex}.calculatorBreakdown`, undefined);
    } else {
      setCalculator({ index: lineIndex, templateId: template.id });
    }
  }

  return (
    <Form {...form}>
      <form
        className="space-y-8"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Invoice details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <ClientPickerDialog
                        clients={clients}
                        value={field.value}
                        onSelect={(id) => field.onChange(id)}
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-full rounded-2xl border border-border bg-surface-subtle/80 p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
                      Payment terms
                    </p>
                    <p className="text-sm text-foreground/80">
                      {paymentTermDisplay}
                    </p>
                    {computedDueDate ? (
                      <p className="text-xs text-muted-foreground/90">
                        Suggested due date{" "}
                        {format(
                          new Date(`${computedDueDate}T12:00:00`),
                          "dd MMM yyyy",
                        )}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className="border border-border bg-surface-overlay text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground"
                  >
                    {paymentTermSourceLabel}
                  </Badge>
                </div>
              </div>
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(event) => {
                            setDueDateTouched(true);
                            field.onChange(event.target.value || undefined);
                          }}
                          onBlur={() => {
                            setDueDateTouched(true);
                            field.onBlur();
                          }}
                        />
                      </FormControl>
                      {dueDateTouched && computedDueDate ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setDueDateTouched(false);
                            form.setValue("dueDate", computedDueDate, {
                              shouldDirty: false,
                              shouldValidate: true,
                            });
                          }}
                        >
                          Reset
                        </Button>
                      ) : null}
                    </div>
                    <FormDescription>
                      {dueDateTouched
                        ? "Manually overridden. Reset to align with payment terms."
                        : "Auto-calculated from payment terms."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO number</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        maxLength={120}
                        autoComplete="off"
                        placeholder="PO-12345"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional client purchase order reference. Shown on the invoice and PDF when provided.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        value={field.value ?? 0}
                        onChange={(event) =>
                          field.onChange(
                            normalizeNumber(event.target.valueAsNumber),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {discountTypeValues.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value.toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        value={field.value ?? 0}
                        onChange={(event) =>
                          field.onChange(
                            normalizeNumber(event.target.valueAsNumber),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shippingLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping method</FormLabel>
                    <Select
                      value={
                        field.value ? field.value : NO_SHIPPING_OPTION_VALUE
                      }
                      onValueChange={(value) =>
                        field.onChange(
                          value === NO_SHIPPING_OPTION_VALUE
                            ? undefined
                            : value,
                        )
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_SHIPPING_OPTION_VALUE}>
                          No shipping
                        </SelectItem>
                        {shippingRegions.map((region) => (
                          <SelectItem key={region.code} value={region.label}>
                            {region.label} ({formatCurrency(region.baseAmount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shippingCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        value={field.value ?? 0}
                        onChange={(event) =>
                          field.onChange(
                            normalizeNumber(event.target.valueAsNumber),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Optional internal notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Invoice terms" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Line items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mobile view */}
            <div className="space-y-4 md:hidden">
              {linesFieldArray.fields.map((field, index) => {
                const line = form.watch(`lines.${index}`);
                const template = line.productTemplateId
                  ? templates.find(
                      (item) => item.id === line.productTemplateId,
                    )
                  : undefined;

                const lineTotal = calculateLineTotal({
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  discountType: line.discountType,
                  discountValue: line.discountValue ?? 0,
                });

                return (
                  <Card key={field.id} className="rounded-2xl border border-border bg-background">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <Select
                            value={
                              line.productTemplateId
                                ? String(line.productTemplateId)
                                : MANUAL_TEMPLATE_OPTION_VALUE
                            }
                            onValueChange={(value) =>
                              applyTemplate(
                                index,
                                value === MANUAL_TEMPLATE_OPTION_VALUE
                                  ? null
                                  : Number(value),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Manual entry" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={MANUAL_TEMPLATE_OPTION_VALUE}>
                                Manual entry
                              </SelectItem>
                              {templates.map((templateOption) => (
                                <SelectItem
                                  key={templateOption.id}
                                  value={String(templateOption.id)}
                                >
                                  {templateOption.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => linesFieldArray.remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {template?.pricingType === "CALCULATED" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit rounded-full"
                          onClick={() =>
                            setCalculator({
                              index,
                              templateId: template.id,
                            })
                          }
                        >
                          Calculator
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">
                            Name
                          </label>
                          <Input
                            value={line.name}
                            onChange={(event) =>
                              form.setValue(
                                `lines.${index}.name`,
                                event.target.value,
                              )
                            }
                            placeholder="Line name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">
                            Description
                          </label>
                          <Textarea
                            value={line.description ?? ""}
                            onChange={(event) =>
                              form.setValue(
                                `lines.${index}.description`,
                                event.target.value,
                              )
                            }
                            rows={2}
                            placeholder="Description (optional)"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                              Qty
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              value={line.quantity}
                              onChange={(event) =>
                                form.setValue(
                                  `lines.${index}.quantity`,
                                  normalizeNumber(event.target.valueAsNumber),
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                              Unit
                            </label>
                            <Input
                              value={line.unit ?? ""}
                              onChange={(event) =>
                                form.setValue(
                                  `lines.${index}.unit`,
                                  event.target.value,
                                )
                              }
                              placeholder="unit"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">
                            Unit Price
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={line.unitPrice}
                            onChange={(event) =>
                              form.setValue(
                                `lines.${index}.unitPrice`,
                                normalizeNumber(event.target.valueAsNumber),
                              )
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                              Discount
                            </label>
                            <Select
                              value={line.discountType}
                              onValueChange={(value: (typeof discountTypeValues)[number]) =>
                                form.setValue(`lines.${index}.discountType`, value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {discountTypeValues.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value.toLowerCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                              Value
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={line.discountValue ?? 0}
                              onChange={(event) =>
                                form.setValue(
                                  `lines.${index}.discountValue`,
                                  normalizeNumber(event.target.valueAsNumber),
                                )
                              }
                              disabled={line.discountType === "NONE"}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-sm text-muted-foreground">
                          Line total
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Desktop view */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-32">Unit price</TableHead>
                    <TableHead className="w-32">Discount</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linesFieldArray.fields.map((field, index) => {
                    const line = form.watch(`lines.${index}`);
                    const template = line.productTemplateId
                      ? templates.find(
                          (item) => item.id === line.productTemplateId,
                        )
                      : undefined;

                    const lineTotal = calculateLineTotal({
                      quantity: line.quantity,
                      unitPrice: line.unitPrice,
                      discountType: line.discountType,
                      discountValue: line.discountValue ?? 0,
                    });

                    return (
                      <TableRow key={field.id} className="align-top">
                        <TableCell>
                          <Select
                            value={
                              line.productTemplateId
                                ? String(line.productTemplateId)
                                : MANUAL_TEMPLATE_OPTION_VALUE
                            }
                            onValueChange={(value) =>
                              applyTemplate(
                                index,
                                value === MANUAL_TEMPLATE_OPTION_VALUE
                                  ? null
                                  : Number(value),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Manual" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={MANUAL_TEMPLATE_OPTION_VALUE}>
                                Manual entry
                              </SelectItem>
                              {templates.map((templateOption) => (
                                <SelectItem
                                  key={templateOption.id}
                                  value={String(templateOption.id)}
                                >
                                  {templateOption.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {template?.pricingType === "CALCULATED" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 rounded-full"
                              onClick={() =>
                                setCalculator({
                                  index,
                                  templateId: template.id,
                                })
                              }
                            >
                              Calculator
                            </Button>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Input
                              value={line.name}
                              onChange={(event) =>
                                form.setValue(
                                  `lines.${index}.name`,
                                  event.target.value,
                                )
                              }
                              placeholder="Line name"
                            />
                            <Textarea
                              value={line.description ?? ""}
                              onChange={(event) =>
                                form.setValue(
                                  `lines.${index}.description`,
                                  event.target.value,
                                )
                              }
                              rows={2}
                              placeholder="Description"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            value={line.quantity}
                            onChange={(event) =>
                              form.setValue(
                                `lines.${index}.quantity`,
                                normalizeNumber(event.target.valueAsNumber),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.unit ?? ""}
                            onChange={(event) =>
                              form.setValue(
                                `lines.${index}.unit`,
                                event.target.value,
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            value={line.unitPrice}
                            onChange={(event) =>
                              form.setValue(
                                `lines.${index}.unitPrice`,
                                normalizeNumber(event.target.valueAsNumber),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Select
                              value={line.discountType}
                              onValueChange={(value) =>
                                form.setValue(
                                  `lines.${index}.discountType`,
                                  value as InvoiceLineInput["discountType"],
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {discountTypeValues.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value.toLowerCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              value={line.discountValue ?? 0}
                              onChange={(event) =>
                                form.setValue(
                                  `lines.${index}.discountValue`,
                                  normalizeNumber(event.target.valueAsNumber),
                                )
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {formatCurrency(lineTotal)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full"
                              onClick={addLine}
                            >
                              Add
                            </Button>
                            {linesFieldArray.fields.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="rounded-full text-red-500"
                                onClick={() => removeLine(index)}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" className="rounded-full" onClick={addLine}>
              Add line item
            </Button>
          </CardContent>
          <CardFooter className="justify-end">
            <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
              <div className="flex min-w-0 justify-between gap-4">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex min-w-0 justify-between gap-4">
                <span>Shipping</span>
                <span>{formatCurrency(totals.shippingCost)}</span>
              </div>
              <div className="flex min-w-0 justify-between gap-4">
                <span>Tax</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex min-w-0 justify-between gap-4 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-full" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : mode === "create"
                ? "Create invoice"
                : "Save changes"}
          </Button>
        </div>
      </form>

      {calculator ? (
        <CalculatorDialog
          open={Boolean(calculator)}
          onClose={() => setCalculator(null)}
          lineIndex={calculator.index}
          template={
            templates.find((item) => item.id === calculator.templateId)!
          }
          settings={settings}
          materials={materials}
          onApply={(result) => {
            form.setValue(`lines.${calculator.index}.unitPrice`, result.total);
            form.setValue(`lines.${calculator.index}.quantity`, 1);
            form.setValue(`lines.${calculator.index}.discountType`, "NONE");
            form.setValue(`lines.${calculator.index}.discountValue`, 0);
            form.setValue(
              `lines.${calculator.index}.calculatorBreakdown`,
              result.breakdown,
            );
            setCalculator(null);
          }}
        />
      ) : null}
    </Form>
  );
}
