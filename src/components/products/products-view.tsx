"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/form";
import { mutateJson, getJson } from "@/lib/http";
import {
  productTemplateInputSchema,
  type ProductTemplateInput,
  productCalculatorSchema,
  pricingTypeValues,
} from "@/lib/schemas/catalog";
import { formatCurrency } from "@/lib/currency";
import { Pencil, Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataCard } from "@/components/ui/data-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, Zap } from "lucide-react";
import {
  DataList,
  DataListContent,
  DataListFooter,
  DataListHeader,
  DataListItem,
  DataListValue,
} from "@/components/ui/data-list";

export type TemplateRecord = {
  id: number;
  name: string;
  description: string;
  unit: string;
  pricingType: "FIXED" | "CALCULATED";
  basePrice: number | null;
  calculatorConfig: ProductTemplateInput["calculatorConfig"] | null;
  materialId: number | null;
  materialName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaterialOption = {
  id: number;
  name: string;
};

interface ProductsViewProps {
  initialTemplates: TemplateRecord[];
  materials: MaterialOption[];
}

type TemplateFormValues = ProductTemplateInput;

const UNLINKED_MATERIAL_VALUE = "__unlinked__";

const queryKey = ["product-templates"] as const;
const templateResolver = zodResolver(
  productTemplateInputSchema,
) as Resolver<TemplateFormValues>;

function defaults(): TemplateFormValues {
  return {
    name: "",
    description: "",
    unit: "unit",
    pricingType: "FIXED",
    basePrice: 0,
    calculatorConfig: {
      baseHours: 1,
      materialGrams: 0,
      quality: "standard",
      infill: "medium",
    },
    materialId: undefined,
  };
}

export function ProductsView({
  initialTemplates,
  materials,
}: ProductsViewProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRecord | null>(null);

  const form = useForm<TemplateFormValues>({
    resolver: templateResolver,
    defaultValues: defaults(),
    mode: "onBlur",
  });

  const { data } = useQuery({
    queryKey,
    queryFn: () => getJson<TemplateRecord[]>("/api/product-templates"),
    initialData: initialTemplates,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaults());
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: (values: TemplateFormValues) =>
      mutateJson<TemplateRecord>("/api/product-templates", {
        method: "POST",
        body: JSON.stringify(normalizePayload(values)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Template created");
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create template",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: TemplateFormValues & { id: number }) =>
      mutateJson<TemplateRecord>(`/api/product-templates/${values.id}`, {
        method: "PUT",
        body: JSON.stringify(normalizePayload(values)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Template updated");
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update template",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      mutateJson<TemplateRecord>(`/api/product-templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Template deleted");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete template",
      );
    },
  });

  function normalizePayload(values: TemplateFormValues): ProductTemplateInput {
    const payload: ProductTemplateInput = {
      name: values.name,
      description: values.description ?? "",
      unit: values.unit,
      pricingType: values.pricingType,
      materialId: values.materialId ?? undefined,
    };

    if (values.pricingType === "FIXED") {
      payload.basePrice = Number(values.basePrice ?? 0);
      payload.calculatorConfig = undefined;
    } else {
      payload.basePrice = undefined;
      payload.calculatorConfig = productCalculatorSchema.parse(
        values.calculatorConfig ?? {
          baseHours: 1,
          materialGrams: 0,
          quality: "standard",
          infill: "medium",
        },
      );
    }

    return payload;
  }

  function openCreate() {
    setEditing(null);
    form.reset(defaults());
    setOpen(true);
  }

  function openEdit(template: TemplateRecord) {
    setEditing(template);
    form.reset({
      name: template.name,
      description: template.description ?? "",
      unit: template.unit,
      pricingType: template.pricingType,
      basePrice: template.basePrice ?? 0,
      calculatorConfig: template.calculatorConfig ?? {
        baseHours: 1,
        materialGrams: 0,
        quality: "standard",
        infill: "medium",
      },
      materialId: template.materialId ?? undefined,
    });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
  }

  function handleDelete(template: TemplateRecord) {
    if (deleteMutation.isPending) return;
    if (!window.confirm(`Delete template ${template.name}?`)) return;
    deleteMutation.mutate(template.id);
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const templates = data ?? [];

  const fixedPriceTemplates = templates.filter(t => t.pricingType === "FIXED");
  const calculatedTemplates = templates.filter(t => t.pricingType === "CALCULATED");
  const linkedMaterials = templates.filter(t => t.materialId).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Product Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Speed up quoting with reusable fixed-price or calculated items.
            </p>
          </div>
          <Button className="rounded-full" onClick={openCreate}>Add Template</Button>
        </div>
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Total Templates
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{templates.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Fixed Price
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{fixedPriceTemplates.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Calculated
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{calculatedTemplates.length}</p>
          </div>
        </div>
      </header>

      {/* Metrics Section */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DataCard
          title="Total Templates"
          value={templates.length}
          description="Product templates in catalog"
          icon={<Package className="h-5 w-5" />}
          tone="slate"
        />
        <DataCard
          title="Fixed Price"
          value={fixedPriceTemplates.length}
          description="Templates with fixed pricing"
          tone="emerald"
        />
        <DataCard
          title="Calculated"
          value={calculatedTemplates.length}
          description="Dynamic pricing templates"
          icon={<Zap className="h-5 w-5" />}
          tone="sky"
        />
        <DataCard
          title="Linked Materials"
          value={linkedMaterials}
          description="Templates with material links"
          tone="amber"
        />
      </section>

      {/* Templates Table */}
      <div className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
        <div className="rounded-3xl border border-border bg-surface-elevated/80 px-6 py-4 shadow-sm shadow-black/5 backdrop-blur">
          <h2 className="text-sm font-medium text-muted-foreground">
            Templates
          </h2>
        </div>
        <div className="p-6">
          <DataList className="md:hidden">
            {templates.length === 0 ? (
              <EmptyState
                title="No templates yet"
                description="Create one to standardize your quotes."
                icon={<Package className="h-8 w-8" />}
                actions={
                  <Button className="rounded-full" onClick={openCreate}>
                    Add Template
                  </Button>
                }
                className="rounded-2xl border-border"
              />
            ) : (
              templates.map((template) => (
                <DataListItem key={template.id}>
                  <DataListHeader>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {template.name}
                      </p>
                      {template.description ? (
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="text-xs uppercase tracking-[0.2em]">
                      {template.pricingType === "FIXED" ? "Fixed" : "Calculated"}
                    </Badge>
                  </DataListHeader>
                  <DataListContent className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="uppercase tracking-[0.2em]">Material</span>
                      <DataListValue className="text-xs font-medium">
                        {template.materialName ?? "Any"}
                      </DataListValue>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="uppercase tracking-[0.2em]">Price</span>
                      <DataListValue className="text-xs font-medium">
                        {template.pricingType === "FIXED"
                          ? formatCurrency(template.basePrice ?? 0)
                          : "Use calculator"}
                      </DataListValue>
                    </div>
                  </DataListContent>
                  <DataListFooter className="gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-full"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-full border-red-200 text-red-600 hover:border-red-500 hover:bg-red-600 hover:text-white"
                      onClick={() => handleDelete(template)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </DataListFooter>
                </DataListItem>
              ))
            )}
          </DataList>
          <div className="hidden overflow-x-auto md:block">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-0">
                    <EmptyState
                      title="No templates yet"
                      description="Create one to standardize your quotes."
                      icon={<Package className="h-8 w-8" />}
                      actions={
                        <Button className="rounded-full" onClick={openCreate}>
                          Add Template
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-white/80">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-zinc-900">
                          {template.name}
                        </span>
                        {template.description ? (
                          <span className="text-xs text-zinc-500">
                            {template.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.pricingType === "FIXED" ? (
                        <Badge
                          variant="outline"
                          className="border-zinc-300/70 text-zinc-600"
                        >
                          Fixed ·{" "}
                          {template.basePrice !== null
                            ? formatCurrency(template.basePrice)
                            : "—"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-blue-200 text-blue-700"
                        >
                          Calculated
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.materialName ? (
                        <Badge
                          variant="outline"
                          className="border-zinc-300/70 text-zinc-600"
                        >
                          {template.materialName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => openEdit(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(template)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => (!next ? closeDialog() : setOpen(true))}
      >
        <DialogContent className="w-[min(100vw-2rem,640px)] max-w-2xl rounded-3xl sm:w-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "New template"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => {
                if (editing) {
                  updateMutation.mutate({ ...values, id: editing.id });
                } else {
                  createMutation.mutate(values);
                }
              })}
              className="space-y-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Small print" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="job" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Optional notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pricingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing mode</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pricingTypeValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value === "FIXED" ? "Fixed price" : "Calculated"}
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
                  name="materialId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material (optional)</FormLabel>
                      <Select
                        value={
                          field.value
                            ? String(field.value)
                            : UNLINKED_MATERIAL_VALUE
                        }
                        onValueChange={(value) =>
                          field.onChange(
                            value === UNLINKED_MATERIAL_VALUE
                              ? undefined
                              : Number(value),
                          )
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UNLINKED_MATERIAL_VALUE}>
                            Unlinked
                          </SelectItem>
                          {materials.map((material) => (
                            <SelectItem
                              key={material.id}
                              value={String(material.id)}
                            >
                              {material.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("pricingType") === "FIXED" ? (
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base price ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="calculatorConfig.baseHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.valueAsNumber)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="calculatorConfig.materialGrams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material grams</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.valueAsNumber)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="calculatorConfig.quality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quality label</FormLabel>
                        <FormControl>
                          <Input placeholder="standard" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="calculatorConfig.infill"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Infill label</FormLabel>
                        <FormControl>
                          <Input placeholder="medium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  className="rounded-full"
                  loading={isSubmitting}
                  loadingText="Saving…"
                >
                  {editing ? "Save changes" : "Create template"}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
