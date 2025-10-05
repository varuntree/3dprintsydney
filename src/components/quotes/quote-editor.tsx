"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { InlineLoader } from "@/components/ui/loader";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  quoteInputSchema,
  discountTypeValues,
  type QuoteLineInput,
  type QuoteInput,
  type DiscountTypeValue,
} from "@/lib/schemas/quotes";
import { formatCurrency } from "@/lib/currency";
import {
  calculateLineTotal,
  calculateDocumentTotals,
} from "@/lib/calculations";
import { mutateJson } from "@/lib/http";
import { useNavigation } from "@/hooks/useNavigation";
import type { ProductTemplateDTO } from "@/server/services/product-templates";
import type { SettingsInput } from "@/lib/schemas/settings";
import type { ClientSummaryRecord } from "@/components/clients/clients-view";
import type { Resolver } from "react-hook-form";

const NO_SHIPPING_OPTION_VALUE = "__no_shipping__";
const MANUAL_TEMPLATE_OPTION_VALUE = "__manual_entry__";

type QuoteLineFormValue = {
  productTemplateId?: number | null;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountType: DiscountTypeValue;
  discountValue?: number;
  calculatorBreakdown?: Record<string, unknown>;
};

type QuoteFormValues = {
  clientId: number;
  issueDate?: string;
  expiryDate?: string;
  taxRate?: number;
  discountType: DiscountTypeValue;
  discountValue?: number;
  shippingCost?: number;
  shippingLabel?: string;
  notes?: string;
  terms?: string;
  lines: QuoteLineFormValue[];
};

interface QuoteEditorProps {
  mode: "create" | "edit";
  quoteId?: number;
  initialValues?: QuoteFormValues;
  clients: ClientSummaryRecord[];
  templates: ProductTemplateDTO[];
  settings: SettingsInput;
  materials: CalculatorMaterialOption[];
}

type CalculatorState = {
  index: number;
  templateId: number;
} | null;

export function QuoteEditor({
  mode,
  quoteId,
  initialValues,
  clients,
  templates,
  settings,
  materials,
}: QuoteEditorProps) {
  const router = useRouter();
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();

  const defaultValues: QuoteFormValues = initialValues ?? {
    clientId: clients[0]?.id ?? 0,
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: undefined,
    taxRate: settings.taxRate ?? 0,
    discountType: "NONE",
    discountValue: 0,
    shippingCost: 0,
    shippingLabel: settings.shippingOptions?.[0]?.label ?? "",
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
        calculatorBreakdown: undefined,
      },
    ],
  };

  const resolver = zodResolver(quoteInputSchema) as Resolver<QuoteFormValues>;

  const form = useForm<QuoteFormValues>({
    resolver,
    defaultValues,
    mode: "onChange",
  });

  const paymentTermOptions = useMemo(
    () => settings.paymentTerms ?? [],
    [settings.paymentTerms],
  );
  const defaultPaymentTermCode = settings.defaultPaymentTerms;
  const watchedClientId = form.watch("clientId");

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === watchedClientId) ?? null;
  }, [clients, watchedClientId]);

  const resolvedPaymentTerm = useMemo(() => {
    if (!paymentTermOptions.length) {
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

  const paymentTermDisplay = useMemo(() => {
    if (!resolvedPaymentTerm) {
      return "COD · Due on acceptance";
    }
    const descriptor =
      resolvedPaymentTerm.days === 0
        ? "Due on acceptance"
        : `${resolvedPaymentTerm.days}-day terms`;
    return `${resolvedPaymentTerm.label} · ${descriptor}`;
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
        lines: initialValues.lines.map((line, index) => ({
          ...line,
          discountValue: line.discountValue ?? 0,
          productTemplateId: line.productTemplateId ?? null,
          orderIndex: index,
        })),
      });
    }
  }, [form, initialValues]);

  const linesFieldArray = useFieldArray({
    name: "lines",
    control: form.control,
  });

  const totals = useQuoteTotals(form.watch(), settings);

  const mutation = useMutation<{ id: number }, Error, QuoteFormValues>({
    mutationFn: async (values: QuoteFormValues) => {
      const payload: QuoteInput = {
        ...values,
        expiryDate: values.expiryDate || undefined,
        discountValue: values.discountValue ?? 0,
        shippingCost: values.shippingCost ?? 0,
        lines: values.lines.map((line, index) => ({
          ...line,
          productTemplateId: line.productTemplateId ?? undefined,
          discountValue: line.discountValue ?? 0,
          orderIndex: index,
        })),
      };
      if (mode === "create") {
        return mutateJson<{ id: number }>("/api/quotes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      return mutateJson<{ id: number }>(`/api/quotes/${quoteId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (result: { id: number }) => {
      toast.success(`Quote ${mode === "create" ? "created" : "updated"}`);
      const targetId = quoteId ?? result.id;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
        quoteId
          ? queryClient.invalidateQueries({ queryKey: ["quote", quoteId] })
          : Promise.resolve(),
      ]);
      await navigate(`/quotes/${targetId}`, { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save quote",
      );
    },
  });

  const [calculator, setCalculator] = useState<CalculatorState>(null);
  const normalizeNumber = (value: number) => (Number.isNaN(value) ? 0 : value);

  const shippingLabel = form.watch("shippingLabel");

  const calculatorLineBreakdown = calculator
    ? (form.getValues(
        `lines.${calculator.index}.calculatorBreakdown`,
      ) as Record<string, unknown> | null)
    : null;

  useEffect(() => {
    if (!shippingLabel) return;
    const match = settings.shippingOptions?.find(
      (option) => option.label === shippingLabel,
    );
    if (match) {
      const current = form.getValues("shippingCost") ?? 0;
      if (current === 0 || current === match.amount) {
        form.setValue("shippingCost", match.amount);
      }
    }
  }, [form, settings.shippingOptions, shippingLabel]);

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
      calculatorBreakdown: undefined,
    });
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
        {mutation.isPending ? (
          <InlineLoader label="Saving quote…" className="text-sm" />
        ) : null}
        <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Quote details
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
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-full rounded-xl border border-border/80 bg-surface-overlay p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                      Payment terms
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {paymentTermDisplay}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-border/70 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {paymentTermSourceLabel}
                  </Badge>
                </div>
              </div>
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
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(event.target.value || null)
                        }
                      />
                    </FormControl>
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
                        {(settings.shippingOptions ?? []).map((option) => (
                          <SelectItem key={option.code} value={option.label}>
                            {option.label} ({formatCurrency(option.amount)})
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
                    <Textarea rows={3} placeholder="Quote terms" {...field} />
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
                                  value as QuoteLineInput["discountType"],
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
                              onClick={() => addLine()}
                              disabled={mutation.isPending}
                              className="gap-2 rounded-full"
                            >
                              Add
                            </Button>
                            {linesFieldArray.fields.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-destructive rounded-full"
                                onClick={() => removeLine(index)}
                                disabled={mutation.isPending}
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

            <Button
              type="button"
              variant="outline"
              onClick={addLine}
              disabled={mutation.isPending}
              className="gap-2 rounded-full"
            >
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
                <span>{formatCurrency(totals.taxTotal)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex min-w-0 justify-between gap-4 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={mutation.isPending}
            className="gap-2 rounded-full"
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            loading={mutation.isPending}
            loadingText="Saving quote…"
            className="gap-2 rounded-full"
          >
            {mode === "create" ? "Create quote" : "Save changes"}
          </LoadingButton>
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
          initialBreakdown={calculatorLineBreakdown}
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

function useQuoteTotals(values: QuoteFormValues, settings: SettingsInput) {
  const lines = values.lines ?? [];
  const lineTotals = lines.map((line) =>
    calculateLineTotal({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue ?? 0,
    }),
  );

  const { total, tax, discounted, subtotal } = calculateDocumentTotals({
    lines: lineTotals.map((total) => ({ total })),
    discountType: values.discountType,
    discountValue: values.discountValue ?? 0,
    shippingCost: values.shippingCost ?? 0,
    taxRate: values.taxRate ?? settings.taxRate ?? 0,
  });

  return {
    subtotal,
    discounted,
    shippingCost: values.shippingCost ?? 0,
    taxTotal: tax,
    total,
  };
}

export type CalculatorMaterialOption = {
  id: number;
  name: string;
  costPerGram: number;
  color?: string | null;
};

export interface CalculatorDialogProps {
  open: boolean;
  onClose: () => void;
  lineIndex: number;
  template: ProductTemplateDTO;
  settings: SettingsInput;
  materials: CalculatorMaterialOption[];
  initialBreakdown?: Record<string, unknown> | null;
  onApply: (result: {
    total: number;
    breakdown: Record<string, unknown>;
  }) => void;
}

export interface CalculatorFormValues {
  hours: number;
  grams: number;
  quality: string;
  infill: string;
  materialId: number | null;
}

export function CalculatorDialog({
  open,
  onClose,
  template,
  settings,
  materials,
  initialBreakdown,
  onApply,
}: CalculatorDialogProps) {
  const materialOptions = useMemo<CalculatorMaterialOption[]>(() => {
    const map = new Map<number, CalculatorMaterialOption>();
    materials.forEach((material) => {
      map.set(material.id, material);
    });

    if (template.materialId) {
      map.set(template.materialId, {
        id: template.materialId,
        name: template.materialName ?? "Template material",
        costPerGram: template.materialCostPerGram ?? 0,
        color: null,
      });
    }

    const breakdownMaterialIdRaw = initialBreakdown?.materialId;
    const breakdownMaterialId =
      typeof breakdownMaterialIdRaw === "number"
        ? breakdownMaterialIdRaw
        : breakdownMaterialIdRaw != null &&
            !Number.isNaN(Number(breakdownMaterialIdRaw))
          ? Number(breakdownMaterialIdRaw)
          : null;

    if (breakdownMaterialId !== null && !map.has(breakdownMaterialId)) {
      map.set(breakdownMaterialId, {
        id: breakdownMaterialId,
        name:
          typeof initialBreakdown?.materialName === "string" &&
          initialBreakdown.materialName.trim().length > 0
            ? initialBreakdown.materialName
            : "Selected material",
        costPerGram:
          typeof initialBreakdown?.materialCostPerGram === "number"
            ? initialBreakdown.materialCostPerGram
            : (template.materialCostPerGram ?? 0),
        color: null,
      });
    }

    return Array.from(map.values());
  }, [
    initialBreakdown?.materialCostPerGram,
    initialBreakdown?.materialId,
    initialBreakdown?.materialName,
    materials,
    template.materialCostPerGram,
    template.materialId,
    template.materialName,
  ]);

  const defaultValues = useMemo<CalculatorFormValues>(() => {
    const fallbackHours = template.calculatorConfig?.baseHours ?? 1;
    const fallbackGrams = template.calculatorConfig?.materialGrams ?? 0;
    const fallbackQuality = template.calculatorConfig?.quality ?? "standard";
    const fallbackInfill = template.calculatorConfig?.infill ?? "medium";
    const fallbackMaterial =
      template.materialId ?? materialOptions[0]?.id ?? null;

    const parsedBreakdownHours =
      typeof initialBreakdown?.hours === "number"
        ? initialBreakdown.hours
        : initialBreakdown?.hours != null &&
            !Number.isNaN(Number(initialBreakdown.hours))
          ? Number(initialBreakdown.hours)
          : null;
    const parsedBreakdownGrams =
      typeof initialBreakdown?.grams === "number"
        ? initialBreakdown.grams
        : initialBreakdown?.grams != null &&
            !Number.isNaN(Number(initialBreakdown.grams))
          ? Number(initialBreakdown.grams)
          : null;
    const parsedBreakdownQuality =
      typeof initialBreakdown?.quality === "string" &&
      initialBreakdown.quality.trim().length > 0
        ? initialBreakdown.quality
        : null;
    const parsedBreakdownInfill =
      typeof initialBreakdown?.infill === "string" &&
      initialBreakdown.infill.trim().length > 0
        ? initialBreakdown.infill
        : null;
    const parsedBreakdownMaterialId =
      typeof initialBreakdown?.materialId === "number"
        ? initialBreakdown.materialId
        : initialBreakdown?.materialId != null &&
            !Number.isNaN(Number(initialBreakdown.materialId))
          ? Number(initialBreakdown.materialId)
          : null;

    return {
      hours: parsedBreakdownHours ?? fallbackHours,
      grams: parsedBreakdownGrams ?? fallbackGrams,
      quality: parsedBreakdownQuality ?? fallbackQuality,
      infill: parsedBreakdownInfill ?? fallbackInfill,
      materialId: parsedBreakdownMaterialId ?? fallbackMaterial,
    };
  }, [
    initialBreakdown?.grams,
    initialBreakdown?.hours,
    initialBreakdown?.infill,
    initialBreakdown?.materialId,
    initialBreakdown?.quality,
    materialOptions,
    template.calculatorConfig?.baseHours,
    template.calculatorConfig?.infill,
    template.calculatorConfig?.materialGrams,
    template.calculatorConfig?.quality,
    template.materialId,
  ]);

  const [values, setValues] = useState(defaultValues);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setValues(defaultValues);
    setIsApplying(false);
  }, [defaultValues, open]);

  const qualityOptions = Object.keys(
    settings.calculatorConfig?.qualityMultipliers ?? {
      standard: 1,
    },
  );

  const infillOptions = Object.keys(
    settings.calculatorConfig?.infillMultipliers ?? {
      medium: 1,
    },
  );

  const calculatorConfig = settings.calculatorConfig ?? {
    hourlyRate: 0,
    setupFee: 0,
    minimumPrice: 0,
    qualityMultipliers: { standard: 1 },
    infillMultipliers: { medium: 1 },
  };

  const qualityMultiplier =
    calculatorConfig.qualityMultipliers?.[values.quality] ?? 1;

  const numericInfill = Number(values.infill);
  const hasNumericInfill =
    !Number.isNaN(numericInfill) && numericInfill >= 0 && numericInfill <= 100;

  const infillMultiplier = hasNumericInfill
    ? 0.3 + (numericInfill / 100) * 0.8
    : (calculatorConfig.infillMultipliers?.[values.infill] ?? 1);

  const selectedMaterial =
    values.materialId !== null
      ? materialOptions.find((material) => material.id === values.materialId)
      : undefined;

  const materialCostPerGram =
    selectedMaterial?.costPerGram ?? template.materialCostPerGram ?? 0;

  const appliedMaterialId = selectedMaterial?.id ?? template.materialId ?? null;
  const appliedMaterialName =
    selectedMaterial?.name ?? template.materialName ?? "Material";

  const baseHourlyRate = calculatorConfig.hourlyRate ?? 0;
  const setupFee = calculatorConfig.setupFee ?? 0;
  const baseLabor = values.hours * baseHourlyRate;
  const labor = baseLabor * qualityMultiplier * infillMultiplier;
  const material = values.grams * materialCostPerGram;
  const minimumPrice = calculatorConfig.minimumPrice ?? 0;
  const baseTotal = labor + setupFee + material;
  const total = Math.max(baseTotal, minimumPrice);

  const infillInputValue =
    hasNumericInfill && !Number.isNaN(numericInfill)
      ? String(numericInfill)
      : "";

  const breakdown = {
    labor,
    setup: setupFee,
    material,
    minimumPrice,
    overridesMinimum: baseTotal < minimumPrice,
  };

  const handleApply = () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      onApply({
        total,
        breakdown: {
          hours: values.hours,
          grams: values.grams,
          quality: values.quality,
          infill: values.infill,
          labor,
          laborBase: baseLabor,
          material,
          materialCostPerGram,
          materialId: appliedMaterialId,
          materialName: appliedMaterialName,
          setup: setupFee,
          qualityMultiplier,
          infillMultiplier,
          minimumPrice,
        },
      });
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-xl rounded-3xl border border-border bg-surface-overlay">
        <DialogHeader>
          <DialogTitle>Pricing calculator</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 text-sm text-muted-foreground">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Material
              </span>
              <Select
                value={
                  values.materialId !== null
                    ? String(values.materialId)
                    : "none"
                }
                onValueChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    materialId: value === "none" ? null : Number(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materialOptions.map((material) => (
                    <SelectItem key={material.id} value={String(material.id)}>
                      {material.name} ({formatCurrency(material.costPerGram)}/g)
                    </SelectItem>
                  ))}
                  <SelectItem value="none">No material</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <div className="rounded-2xl border border-border bg-surface-overlay p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Preview
              </p>
              <div className="mt-3 space-y-2 text-foreground">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                    Total
                  </span>
                  <span className="text-2xl font-semibold tracking-tight">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground">
                  <span>Labor • {formatCurrency(labor)}</span>
                  <span>Material • {formatCurrency(material)}</span>
                  <span>Setup • {formatCurrency(setupFee)}</span>
                  <span>
                    Multipliers • quality ×{qualityMultiplier.toFixed(2)} ·
                    infill ×{infillMultiplier.toFixed(2)}
                  </span>
                  {breakdown.overridesMinimum ? (
                    <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Minimum price applied
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Hours
              </span>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={values.hours}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    hours: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Material grams
              </span>
              <Input
                type="number"
                step="1"
                min={0}
                value={values.grams}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    grams: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Quality
              </span>
              <Select
                value={values.quality}
                onValueChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    quality: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {qualityOptions.map((quality) => (
                    <SelectItem key={quality} value={quality}>
                      {quality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
                Infill
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  value={infillInputValue}
                  placeholder="%"
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      infill: event.target.value,
                    }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  {infillOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={values.infill === option ? "default" : "outline"}
                      size="sm"
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() =>
                        setValues((prev) => ({
                          ...prev,
                          infill: option,
                        }))
                      }
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/80">
                Enter a percentage or choose a preset above.
              </p>
            </label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isApplying}
            className="rounded-full"
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            loading={isApplying}
            loadingText="Applying…"
            onClick={handleApply}
            className="gap-2 rounded-full"
          >
            Apply pricing
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
