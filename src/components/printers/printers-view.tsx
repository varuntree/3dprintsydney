"use client";

import { useState } from "react";
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
  printerInputSchema,
  printerStatusValues,
  type PrinterInput,
  type PrinterStatusValue,
} from "@/lib/schemas/catalog";
import { Pencil, Trash2 } from "lucide-react";

export type PrinterRecord = {
  id: number;
  name: string;
  model: string;
  buildVolume: string;
  status: PrinterStatusValue;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

interface PrintersViewProps {
  initialPrinters: PrinterRecord[];
}

type PrinterFormValues = PrinterInput;

const queryKey = ["printers"] as const;
const printerResolver = zodResolver(
  printerInputSchema,
) as Resolver<PrinterFormValues>;

const statusLabels: Record<PrinterStatusValue, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  OFFLINE: "Offline",
};

const statusBadgeStyles: Record<PrinterStatusValue, string> = {
  ACTIVE: "border-emerald-200 text-emerald-700",
  MAINTENANCE: "border-amber-200 text-amber-700",
  OFFLINE: "border-zinc-300 text-zinc-500",
};

function defaults(): PrinterFormValues {
  return {
    name: "",
    model: "",
    buildVolume: "",
    status: "ACTIVE",
    notes: "",
  };
}

export function PrintersView({ initialPrinters }: PrintersViewProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PrinterRecord | null>(null);

  const form = useForm<PrinterFormValues>({
    resolver: printerResolver,
    defaultValues: defaults(),
  });

  const { data } = useQuery({
    queryKey,
    queryFn: () => getJson<PrinterRecord[]>("/api/printers"),
    initialData: initialPrinters,
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: (values: PrinterFormValues) =>
      mutateJson<PrinterRecord>("/api/printers", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Printer added");
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add printer",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: PrinterFormValues & { id: number }) =>
      mutateJson<PrinterRecord>(`/api/printers/${values.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: async (_res, variables) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Printer updated");
      // If status moved to maintenance/offline, offer to clear queue
      if (editing && (variables.status === "MAINTENANCE" || variables.status === "OFFLINE") && editing.status === "ACTIVE") {
        const proceed = window.confirm("Printer moved out of Active. Unassign queued/paused jobs for this printer now?");
        if (proceed) {
          try {
            await mutateJson(`/api/printers/${variables.id}/clear-queue`, { method: "POST" });
            toast.success("Queue cleared for printer");
            queryClient.invalidateQueries({ queryKey: ["jobs-board"] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to clear queue");
          }
        }
      }
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update printer",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      mutateJson<PrinterRecord>(`/api/printers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Printer deleted");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete printer",
      );
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset(defaults());
    setOpen(true);
  }

  function openEdit(printer: PrinterRecord) {
    setEditing(printer);
    form.reset({
      name: printer.name,
      model: printer.model ?? "",
      buildVolume: printer.buildVolume ?? "",
      status: printer.status,
      notes: printer.notes ?? "",
    });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
  }

  function handleDelete(printer: PrinterRecord) {
    if (deleteMutation.isPending) return;
    if (!window.confirm(`Delete ${printer.name}?`)) return;
    deleteMutation.mutate(printer.id);
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const printers = data ?? [];

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Printers</h2>
          <p className="text-sm text-zinc-500">
            Track printer availability, maintenance states, and key notes.
          </p>
        </div>
        <Button onClick={openCreate}>Add Printer</Button>
      </div>

      <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">
            Printer Fleet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Build Volume</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-sm text-zinc-500"
                  >
                    No printers registered yet. Add your primary machines here.
                  </TableCell>
                </TableRow>
              ) : (
                printers.map((printer) => (
                  <TableRow key={printer.id} className="hover:bg-white/80">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-zinc-900">
                          {printer.name}
                        </span>
                        {printer.notes ? (
                          <span className="text-xs text-zinc-500">
                            {printer.notes}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusBadgeStyles[printer.status]}
                      >
                        {statusLabels[printer.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {printer.model || (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {printer.buildVolume || (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          title="Unassign queued/paused jobs for this printer"
                          onClick={async () => {
                            if (!window.confirm("Unassign queued/paused jobs for this printer?")) return;
                            try {
                              await mutateJson(`/api/printers/${printer.id}/clear-queue`, { method: "POST" });
                              toast.success("Queue cleared for printer");
                              queryClient.invalidateQueries({ queryKey: ["jobs-board"] });
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Failed to clear queue");
                            }
                          }}
                        >
                          Clear queue
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(printer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(printer)}
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

      <Dialog
        open={open}
        onOpenChange={(next) => (!next ? closeDialog() : setOpen(true))}
      >
        <DialogContent className="max-w-xl border border-zinc-200/70 bg-white/80 backdrop-blur">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "New printer"}
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
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bambu X1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="BambuLab X1 Carbon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buildVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Build volume</FormLabel>
                      <FormControl>
                        <Input placeholder="256 x 256 x 256 mm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {printerStatusValues.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value !== "ACTIVE" ? (
                      <p className="mt-1 text-xs text-amber-600">
                        Assignments to this printer are blocked while not Active. You may need to clear its queued jobs.
                      </p>
                    ) : null}
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
                        placeholder="Maintenance schedules or spool notes"
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : "Create printer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
