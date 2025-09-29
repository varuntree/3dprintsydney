"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { materialInputSchema, type MaterialInput } from "@/lib/schemas/catalog";
import { mutateJson, getJson } from "@/lib/http";
import { formatCurrency } from "@/lib/currency";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Pencil, Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageHeader } from "@/components/ui/page-header";

export type MaterialRecord = {
  id: number;
  name: string;
  color: string;
  category: string;
  costPerGram: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

interface MaterialsViewProps {
  initial: MaterialRecord[];
}

type MaterialFormValues = MaterialInput;

const queryKey = ["materials"] as const;

export function MaterialsView({ initial }: MaterialsViewProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialRecord | null>(null);

  const { data } = useQuery({
    queryKey,
    queryFn: () => getJson<MaterialRecord[]>("/api/materials"),
    initialData: initial,
    staleTime: 1000 * 60,
  });

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialInputSchema),
    defaultValues: getDefaults(),
  });

  const createMutation = useMutation({
    mutationFn: (values: MaterialFormValues) =>
      mutateJson<MaterialRecord>("/api/materials", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Material added");
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add material",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: MaterialFormValues & { id: number }) =>
      mutateJson<MaterialRecord>(`/api/materials/${values.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Material updated");
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update material",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      mutateJson<MaterialRecord>(`/api/materials/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Material deleted");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete material",
      );
    },
  });

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    form.reset(getDefaults());
  }

  function handleCreate() {
    setEditing(null);
    form.reset(getDefaults());
    setOpen(true);
  }

  function handleEdit(record: MaterialRecord) {
    setEditing(record);
    form.reset({
      name: record.name,
      color: record.color,
      category: record.category,
      costPerGram: record.costPerGram,
      notes: record.notes,
    });
    setOpen(true);
  }

  function handleDelete(record: MaterialRecord) {
    if (deleteMutation.isPending) return;
    const confirmDelete = window.confirm(`Delete ${record.name}?`);
    if (!confirmDelete) return;
    deleteMutation.mutate(record.id);
  }

  function onSubmit(values: MaterialFormValues) {
    if (editing) {
      updateMutation.mutate({ ...values, id: editing.id });
    } else {
      createMutation.mutate(values);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const grouped = useMemo(() => {
    const materials = data ?? [];
    return materials;
  }, [data]);

  const averageCost = useMemo(() => {
    if (grouped.length === 0) return 0;
    const total = grouped.reduce((sum, material) => sum + material.costPerGram, 0);
    return total / grouped.length;
  }, [grouped]);

  return (
    <>
      <PageHeader
        title="Materials"
        description="Maintain material costs and metadata for accurate pricing."
        meta={
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
            <span>{grouped.length} tracked</span>
            <span>{formatCurrency(averageCost)} avg $/g</span>
          </div>
        }
        actions={
          <Dialog
            open={open}
            onOpenChange={(next) => (!next ? closeDialog() : setOpen(true))}
          >
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>Add Material</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editing ? `Edit ${editing.name}` : "New material"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="PLA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colour</FormLabel>
                        <FormControl>
                          <Input placeholder="Assorted" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="General" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="costPerGram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per gram ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Handling tips or suppliers"
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
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    loading={isSubmitting}
                    loadingText="Saving…"
                  >
                    {editing ? "Save changes" : "Create material"}
                  </LoadingButton>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">
            Material Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Colour</TableHead>
                <TableHead>Cost / g</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-sm text-zinc-500"
                  >
                    No materials yet. Add your first material to start pricing
                    accurately.
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map((material) => (
                  <TableRow key={material.id} className="hover:bg-white/80">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900">
                          {material.name}
                        </span>
                        {material.notes ? (
                          <span className="text-xs text-zinc-500">
                            {material.notes}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {material.category ? (
                        <Badge
                          variant="outline"
                          className="border-zinc-300/70 text-zinc-600"
                        >
                          {material.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {material.color || (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(material.costPerGram, "AUD")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(material)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(material)}
                          disabled={deleteMutation.isPending}
                          className="text-red-500 hover:text-red-600"
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
        </CardContent>
      </Card>
    </>
  );
}

function getDefaults(): MaterialFormValues {
  return {
    name: "",
    color: "",
    category: "",
    costPerGram: 0,
    notes: "",
  };
}
