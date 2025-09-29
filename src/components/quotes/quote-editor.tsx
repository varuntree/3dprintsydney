"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  }, [defaultPaymentTermCode, paymentTermOptions, selectedClient?.paymentTerms]);

  const paymentTermDisplay = useMemo(() => {
    if (!resolvedPaymentTerm) {
      return "Payment terms unavailable";
    }
    const descriptor =
      resolvedPaymentTerm.days === 0
        ? "Due on acceptance"
        : `${resolvedPaymentTerm.days}-day terms`;
    return `${resolvedPaymentTerm.label} · ${descriptor}`;
  }, [resolvedPaymentTerm]);

  const paymentTermSourceLabel = selectedClient?.paymentTerms
    ? "Client default"
    : "Settings default";

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
        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-900">
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
              <div className="col-span-full rounded-xl border border-zinc-200/80 bg-white/70 p-4 text-sm text-zinc-600">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Payment terms</p>
                    <p className="text-sm text-zinc-600">{paymentTermDisplay}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-zinc-300/70 text-xs font-medium uppercase tracking-wide text-zinc-600"
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
                        field.value
                          ? field.value
                          : NO_SHIPPING_OPTION_VALUE
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

        <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-900">
              Line items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="max-h-[60vh] rounded-2xl border border-zinc-200/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Template</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[90px]">Qty</TableHead>
                    <TableHead className="w-[100px]">Unit</TableHead>
                    <TableHead className="w-[120px]">Unit price</TableHead>
                    <TableHead className="w-[150px]">Discount</TableHead>
                    <TableHead className="w-[110px]">Total</TableHead>
                    <TableHead className="w-[90px]">Actions</TableHead>
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
                              className="mt-2"
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
                          <p className="font-medium text-zinc-900">
                            {formatCurrency(lineTotal)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => addLine()}
                            >
                              Add
                            </Button>
                            {linesFieldArray.fields.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-red-500"
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
            </ScrollArea>

            <Button type="button" variant="outline" onClick={addLine}>
              Add line item
            </Button>
          </CardContent>
          <CardFooter className="justify-end">
            <div className="flex flex-col items-end gap-1 text-sm text-zinc-600">
              <div className="flex min-w-[240px] justify-between gap-4">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex min-w-[240px] justify-between gap-4">
                <span>Shipping</span>
                <span>{formatCurrency(totals.shippingCost)}</span>
              </div>
              <div className="flex min-w-[240px] justify-between gap-4">
                <span>Tax</span>
                <span>{formatCurrency(totals.taxTotal)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex min-w-[240px] justify-between gap-4 text-base font-semibold text-zinc-900">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : mode === "create"
                ? "Create quote"
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

    return Array.from(map.values());
  }, [materials, template.materialCostPerGram, template.materialId, template.materialName]);

  const defaultValues = useMemo<CalculatorFormValues>(() => ({
    hours: template.calculatorConfig?.baseHours ?? 1,
    grams: template.calculatorConfig?.materialGrams ?? 0,
    quality: template.calculatorConfig?.quality ?? "standard",
    infill: template.calculatorConfig?.infill ?? "medium",
    materialId: template.materialId ?? materialOptions[0]?.id ?? null,
  }), [
    materialOptions,
    template.calculatorConfig?.baseHours,
    template.calculatorConfig?.infill,
    template.calculatorConfig?.materialGrams,
    template.calculatorConfig?.quality,
    template.materialId,
  ]);

  const [values, setValues] = useState(defaultValues);

  useEffect(() => {
    setValues(defaultValues);
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
    : calculatorConfig.infillMultipliers?.[values.infill] ?? 1;

  const selectedMaterial =
    values.materialId !== null
      ? materialOptions.find((material) => material.id === values.materialId)
      : undefined;

  const materialCostPerGram =
    selectedMaterial?.costPerGram ??
    template.materialCostPerGram ??
    0;

  const appliedMaterialId =
    selectedMaterial?.id ?? template.materialId ?? null;

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

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pricing calculator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-zinc-600">
          <div className="grid gap-3">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                Material
              </span>
              <Select
                value={values.materialId !== null ? String(values.materialId) : "none"}
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
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">
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
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">
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
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                Quality
              </span>
              <Select
                value={values.quality}
                onValueChange={(value) =>
                  setValues((prev) => ({ ...prev, quality: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qualityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                Infill
              </span>
              <Select
                value={values.infill}
                onValueChange={(value) =>
                  setValues((prev) => ({ ...prev, infill: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={hasNumericInfill ? `${numericInfill}%` : undefined} />
                </SelectTrigger>
                <SelectContent>
                  {infillOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                type="number"
                min={0}
                max={100}
                placeholder="Custom %"
                value={infillInputValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setValues((prev) => ({
                    ...prev,
                    infill:
                      value.trim().length === 0 ? defaultValues.infill : value,
                  }));
                }}
              />
              <p className="text-xs text-zinc-500">Leave blank to use a preset multiplier.</p>
            </label>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 bg-white/70 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
              Preview
            </p>
            <div className="mt-2 text-lg font-semibold text-zinc-900">
              {formatCurrency(total)}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li>
                Labor {formatCurrency(labor)} (rate {formatCurrency(baseHourlyRate)}/hr)
              </li>
              <li>
                Material {formatCurrency(material)} at {formatCurrency(materialCostPerGram)}/g
              </li>
              <li>Setup {formatCurrency(setupFee)}</li>
              <li>
                Multipliers: quality ×{qualityMultiplier.toFixed(2)}, infill ×
                {infillMultiplier.toFixed(2)}
              </li>
              <li>Minimum price {formatCurrency(minimumPrice)}</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
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
              })
            }
          >
            Use price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
