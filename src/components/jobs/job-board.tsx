"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import {
  type JobPriority,
  type JobStatus,
  type InvoiceStatus,
  type PrinterStatus,
} from "@prisma/client";
import {
  jobPriorityValues,
  jobUpdateSchema,
  type JobUpdateInput,
} from "@/lib/schemas/jobs";
import { getJson, mutateJson } from "@/lib/http";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ActionRail } from "@/components/ui/action-rail";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle,
  Check,
  Clock,
  Pause,
  Play,
  RefreshCcw,
  X,
  Pencil,
} from "lucide-react";

export type JobBoardClientSnapshot = {
  columns: JobBoardClientColumn[];
  summary: JobBoardSummary;
};

export type JobBoardClientColumn = {
  key: string;
  printerId: number | null;
  printerName: string;
  printerStatus: PrinterStatus | "UNASSIGNED";
  jobs: JobCardClient[];
  metrics: ColumnMetrics;
};

export type JobCardClient = {
  id: number;
  title: string;
  description: string | null;
  status: JobStatus;
  priority: JobPriority;
  printerId: number | null;
  printerName: string | null;
  queuePosition: number;
  clientName: string;
  invoiceId: number;
  invoiceNumber: string;
  invoiceStatus: InvoiceStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  notes: string | null;
};

export type JobBoardSummary = {
  totalJobs: number;
  queued: number;
  active: number;
  completedToday: number;
  unassigned: number;
  totalEstimatedHours: number;
  printersWithWork: number;
};

export type ColumnMetrics = {
  queuedCount: number;
  activeCount: number;
  totalEstimatedHours: number;
};

type JobsBoardProps = {
  initial: JobBoardClientSnapshot;
};

const queryKey = ["jobs-board"] as const;

const priorityLabels: Record<JobPriority, string> = {
  NORMAL: "Normal",
  FAST_TRACK: "Fast Track",
  URGENT: "Urgent",
};

const priorityStyles: Record<JobPriority, string> = {
  NORMAL: "border-zinc-200 text-zinc-500",
  FAST_TRACK: "border-amber-200 text-amber-600",
  URGENT: "border-rose-300 text-rose-600",
};

const statusLabels: Record<JobStatus, string> = {
  QUEUED: "Queued",
  PRINTING: "Printing",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<JobStatus, string> = {
  QUEUED: "bg-zinc-100 text-zinc-600",
  PRINTING: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-sky-100 text-sky-700",
  CANCELLED: "bg-rose-100 text-rose-600",
};

const metricTones = {
  slate: "border-zinc-200/70",
  emerald: "border-emerald-200/70",
  sky: "border-sky-200/70",
} as const;

type MetricTone = keyof typeof metricTones;

function columnKeyFor(printerId: number | null) {
  return printerId === null ? "unassigned" : `printer-${printerId}`;
}

function cloneBoard(board: JobBoardClientSnapshot): JobBoardClientSnapshot {
  return {
    columns: board.columns.map((column) => ({
      ...column,
      metrics: { ...column.metrics },
      jobs: column.jobs.map((job) => ({ ...job })),
    })),
    summary: { ...board.summary },
  };
}

function recalcColumns(columns: JobBoardClientColumn[]): JobBoardClientColumn[] {
  return columns.map((column) => {
    const metrics = column.jobs.reduce(
      (acc, job) => {
        if (job.status === "QUEUED") acc.queuedCount += 1;
        if (job.status === "PRINTING") acc.activeCount += 1;
        if (typeof job.estimatedHours === "number") {
          acc.totalEstimatedHours += job.estimatedHours;
        }
        return acc;
      },
      { queuedCount: 0, activeCount: 0, totalEstimatedHours: 0 },
    );

    return {
      ...column,
      metrics: {
        queuedCount: metrics.queuedCount,
        activeCount: metrics.activeCount,
        totalEstimatedHours: Number(metrics.totalEstimatedHours.toFixed(2)),
      },
    };
  });
}

function buildSummary(columns: JobBoardClientColumn[]): JobBoardSummary {
  const now = new Date();
  const base = columns.reduce(
    (acc, column) => {
      acc.totalJobs += column.jobs.length;
      acc.queued += column.metrics.queuedCount;
      acc.active += column.metrics.activeCount;
      if (column.printerId === null) {
        acc.unassigned = column.jobs.length;
      }
      acc.totalEstimatedHours += column.metrics.totalEstimatedHours;
      if (column.printerId !== null && column.jobs.length > 0) {
        acc.printersWithWork += 1;
      }
      const completedToday = column.jobs.filter((job) => {
        if (!job.completedAt) return false;
        const completed = new Date(job.completedAt);
        return (
          completed.getFullYear() === now.getFullYear() &&
          completed.getMonth() === now.getMonth() &&
          completed.getDate() === now.getDate()
        );
      }).length;
      acc.completedToday += completedToday;
      return acc;
    },
    {
      totalJobs: 0,
      queued: 0,
      active: 0,
      completedToday: 0,
      unassigned: 0,
      totalEstimatedHours: 0,
      printersWithWork: 0,
    },
  );

  return {
    ...base,
    totalEstimatedHours: Number(base.totalEstimatedHours.toFixed(2)),
  };
}

function buildBoard(columns: JobBoardClientColumn[]): JobBoardClientSnapshot {
  const recalculated = recalcColumns(columns);
  return {
    columns: recalculated,
    summary: buildSummary(recalculated),
  };
}

function resolveOverColumnKey(over: DragEndEvent["over"] | DragOverEvent["over"]) {
  if (!over) return null;
  const data = over.data.current as { type?: string; columnKey?: string } | undefined;
  if (!data) {
    const id = over.id;
    if (typeof id === "string" && id.startsWith("column:")) {
      return id.split(":")[1] ?? null;
    }
    return null;
  }
  if (data.type === "column" && data.columnKey) return data.columnKey;
  if (data.type === "job" && data.columnKey) return data.columnKey;
  return null;
}

export function JobsBoard({ initial }: JobsBoardProps) {
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [board, setBoard] = useState<JobBoardClientSnapshot>(initial);
  const [activeId, setActiveId] = useState<number | null>(null);
  const boardRef = useRef(board);
  const [editingJob, setEditingJob] = useState<JobCardClient | null>(null);
  const [statusPrompt, setStatusPrompt] = useState<
    | {
        job: JobCardClient;
        status: JobStatus;
      }
    | null
  >(null);
  const [statusNote, setStatusNote] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  type ViewMode = "active" | "completed-today" | "archived" | "all";
  const [view, setView] = useState<ViewMode>("active");

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get("view");
      const allowed: ViewMode[] = ["active", "completed-today", "archived", "all"];
      if (v && (allowed as string[]).includes(v)) {
        setView(v as ViewMode);
        return;
      }
      const saved = window.localStorage.getItem("jobs:view");
      if (saved && (allowed as string[]).includes(saved)) {
        setView(saved as ViewMode);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("jobs:view", view);
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [view]);

  function buildJobsUrl(mode: ViewMode) {
    const params = new URLSearchParams();
    if (mode === "active") {
      ["QUEUED", "PRINTING", "PAUSED"].forEach((s) => params.append("status", s));
      params.set("archived", "false");
    } else if (mode === "completed-today") {
      params.append("status", "COMPLETED");
      params.set("completedWindow", "today");
    } else if (mode === "archived") {
      params.set("archived", "true");
    } else if (mode === "all") {
      params.set("archived", "true");
    }
    const qs = params.toString();
    return qs ? `/api/jobs?${qs}` : "/api/jobs";
  }

  const { data } = useQuery({
    queryKey: ["jobs-board", view] as const,
    queryFn: () => getJson<JobBoardClientSnapshot>(buildJobsUrl(view)),
    initialData: initial,
    staleTime: 4_000,
  });

  useEffect(() => {
    if (data) {
      setBoard(data);
      boardRef.current = data;
    }
  }, [data]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const reorderMutation = useMutation({
    mutationFn: (entries: { id: number; queuePosition: number; printerId: number | null }[]) =>
      mutateJson<{ success: boolean }>("/api/jobs/reorder", {
        method: "POST",
        body: JSON.stringify(entries),
      }),
    onMutate: async () => ({ previous: cloneBoard(boardRef.current) }),
    onError: (error, _vars, context) => {
      if (context?.previous) {
        setBoard(context.previous);
        boardRef.current = context.previous;
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to update queue order",
      );
    },
    onSuccess: () => {
      toast.success("Queue updated");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: JobStatus; note?: string }) =>
      mutateJson(`/api/jobs/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: () => {
      toast.success("Job status updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update job status",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: JobUpdateInput }) =>
      mutateJson(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: (_response, variables) => {
      applyLocalJobUpdate(variables.id, (job) => ({
        ...job,
        title: variables.values.title,
        description: variables.values.description?.trim() || null,
        priority: variables.values.priority,
        printerId:
          variables.values.printerId === undefined
            ? job.printerId
            : variables.values.printerId,
        printerName:
          variables.values.printerId === undefined
            ? job.printerName
            : resolvePrinterName(variables.values.printerId),
        estimatedHours:
          variables.values.estimatedHours === undefined
            ? job.estimatedHours
            : variables.values.estimatedHours,
        notes: variables.values.notes?.trim() || null,
      }));
      toast.success("Job updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update job");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      mutateJson(`/api/jobs/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast.success("Job archived");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to archive job");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: number[]) =>
      mutateJson<{ count: number }>(`/api/jobs/archive`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: (res) => {
      toast.success(`${res.count} job(s) archived`);
      setSelected(new Set());
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to archive jobs");
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const form = useForm<JobUpdateInput>({
    resolver: zodResolver(jobUpdateSchema) as Resolver<JobUpdateInput>,
    defaultValues: {
      title: "",
      description: "",
      priority: "NORMAL",
      printerId: null,
      estimatedHours: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (!editingJob) return;
    form.reset({
      title: editingJob.title,
      description: editingJob.description ?? "",
      priority: editingJob.priority,
      printerId: editingJob.printerId,
      estimatedHours: editingJob.estimatedHours ?? null,
      notes: editingJob.notes ?? "",
    });
  }, [editingJob, form]);

  function resolvePrinterName(printerId: number | null | undefined) {
    if (printerId === null || printerId === undefined) return null;
    const column = board.columns.find((entry) => entry.printerId === printerId);
    return column?.printerName ?? null;
  }

  function applyLocalJobUpdate(
    id: number,
    updater: (job: JobCardClient) => JobCardClient,
  ) {
    setBoard((prev) => {
      const columns = prev.columns.map((column) => ({
        ...column,
        jobs: column.jobs.map((job) => ({ ...job })),
      }));

      const sourceColumnIndex = columns.findIndex((column) =>
        column.jobs.some((job) => job.id === id),
      );
      if (sourceColumnIndex === -1) {
        return prev;
      }

      const sourceColumn = columns[sourceColumnIndex]!;
      const sourceJobIndex = sourceColumn.jobs.findIndex((job) => job.id === id);
      if (sourceJobIndex === -1) {
        return prev;
      }

      const existingJob = sourceColumn.jobs[sourceJobIndex];
      const updatedJob = updater(existingJob);
      sourceColumn.jobs[sourceJobIndex] = updatedJob;

      const targetColumnKey = columnKeyFor(updatedJob.printerId);
      const currentColumnKey = sourceColumn.key;

      if (targetColumnKey !== currentColumnKey) {
        const destinationColumn = columns.find((column) => column.key === targetColumnKey);
        if (destinationColumn) {
          const removed = sourceColumn.jobs.splice(sourceJobIndex, 1);
          const moving = removed[0];
          if (moving) {
            const merged = { ...moving, ...updatedJob };
            destinationColumn.jobs.push(merged);
          }
          destinationColumn.jobs = destinationColumn.jobs.map((job, index) => ({
            ...job,
            queuePosition: index,
          }));
        }
        sourceColumn.jobs = sourceColumn.jobs.map((job, index) => ({
          ...job,
          queuePosition: index,
        }));
      }

      const next = buildBoard(columns);
      boardRef.current = next;
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = Number(event.active.id);
    setActiveId(Number.isFinite(id) ? id : null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = Number(active.id);
    if (!Number.isFinite(activeId)) return;
    const activeColumnKey = (active.data.current as { columnKey?: string } | undefined)?.columnKey;
    const overColumnKey = resolveOverColumnKey(over);
    if (!activeColumnKey || !overColumnKey) return;
    if (activeColumnKey === overColumnKey) return;

    setBoard((prev) => simulateMove(prev, activeId, overColumnKey, over));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) {
      setBoard(boardRef.current);
      return;
    }

    const activeId = Number(active.id);
    if (!Number.isFinite(activeId)) return;

    const overColumnKey = resolveOverColumnKey(over);
    const activeColumnKey = (active.data.current as { columnKey?: string } | undefined)?.columnKey;
    if (!overColumnKey || !activeColumnKey) {
      setBoard(boardRef.current);
      return;
    }

    const updated = simulateMove(boardRef.current, activeId, overColumnKey, over);
    setBoard(updated);
    boardRef.current = updated;

    const payload = updated.columns.flatMap((column) =>
      column.jobs.map((job, index) => ({
        id: job.id,
        queuePosition: index,
        printerId: column.printerId,
      })),
    );
    reorderMutation.mutate(payload);
  }

  function simulateMove(
    snapshot: JobBoardClientSnapshot,
    jobId: number,
    targetColumnKey: string,
    over: DragOverEvent["over"] | DragEndEvent["over"],
  ) {
    const columns = snapshot.columns.map((column) => ({
      ...column,
      jobs: column.jobs.map((job) => ({ ...job })),
    }));
    const sourceColumn = columns.find((column) =>
      column.jobs.some((job) => job.id === jobId),
    );
    const destinationColumn = columns.find((column) => column.key === targetColumnKey);
    if (!sourceColumn || !destinationColumn) return snapshot;

    const sourceIndex = sourceColumn.jobs.findIndex((job) => job.id === jobId);
    if (sourceIndex === -1) return snapshot;

    const overData = over?.data.current as { type?: string } | undefined;
    const overJobId = overData?.type === "job" && typeof over?.id === "number" ? Number(over.id) : null;

    if (sourceColumn.key === destinationColumn.key) {
      const jobs = destinationColumn.jobs;
      const [moving] = jobs.splice(sourceIndex, 1);
      let insertAt = jobs.length;
      if (overJobId !== null) {
        const index = jobs.findIndex((job) => job.id === overJobId);
        insertAt = index === -1 ? jobs.length : index;
      }
      jobs.splice(insertAt, 0, moving);
      destinationColumn.jobs = jobs.map((job, index) => ({
        ...job,
        queuePosition: index,
      }));
      return buildBoard(columns);
    }

    const [moving] = sourceColumn.jobs.splice(sourceIndex, 1);
    moving.printerId = destinationColumn.printerId;
    moving.printerName = destinationColumn.printerName;

    let insertAt = destinationColumn.jobs.length;
    if (overJobId !== null) {
      const index = destinationColumn.jobs.findIndex((job) => job.id === overJobId);
      insertAt = index === -1 ? destinationColumn.jobs.length : index;
    }
    destinationColumn.jobs.splice(insertAt, 0, moving);

    destinationColumn.jobs = destinationColumn.jobs.map((job, index) => ({
      ...job,
      queuePosition: index,
    }));
    sourceColumn.jobs = sourceColumn.jobs.map((job, index) => ({
      ...job,
      queuePosition: index,
    }));

    return buildBoard(columns);
  }

  const printerOptions = useMemo(() => {
    return board.columns
      .filter((column) => column.printerId !== null)
      .map((column) => ({
        id: column.printerId!,
        name: column.printerName,
        status: column.printerStatus,
      }));
  }, [board.columns]);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        <PageHeader
          title="Jobs & Queue"
          description="Drag jobs between printers, adjust details, and update status as work progresses."
          meta={
            <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
              <span>{board.summary.active} active</span>
              <span>{board.summary.queued} queued</span>
              <span>{board.summary.printersWithWork} printers busy</span>
            </div>
          }
          actions={
            <ActionRail align="start" wrap>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex w-full overflow-hidden rounded-md border border-input bg-background text-xs font-medium shadow-sm sm:w-auto">
                  {(
                    [
                      { key: "active", label: "Active" },
                      { key: "completed-today", label: "Completed" },
                      { key: "archived", label: "Archived" },
                      { key: "all", label: "All" },
                    ] as { key: ViewMode; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setView(opt.key)}
                      className={cn(
                        "flex-1 px-3 py-1.5 transition",
                        view === opt.key
                          ? "bg-accent-soft text-foreground"
                          : "text-muted-foreground hover:bg-surface-subtle",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant={selectMode ? "default" : "outline"}
                  onClick={() => setSelectMode((v) => !v)}
                  className="sm:shrink-0"
                >
                  {selectMode ? "Selecting…" : "Select"}
                </Button>
              </div>
            </ActionRail>
          }
        />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Jobs" value={board.summary.totalJobs} tone="slate" />
          <MetricCard label="Queued" value={board.summary.queued} tone="slate" />
          <MetricCard
            label="Active"
            value={board.summary.active}
            helper={`${board.summary.printersWithWork} printer${board.summary.printersWithWork === 1 ? "" : "s"}`}
            tone="emerald"
          />
          <MetricCard
            label="Est. Hours"
            value={board.summary.totalEstimatedHours.toFixed(1)}
            tone="sky"
          />
        </section>

        {(selected.size > 0 || selectMode) && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200/70 bg-white/70 p-3 text-sm sm:flex-row sm:items-center">
            <span className="text-zinc-600">Selected: {selected.size}</span>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkArchiveMutation.mutate(Array.from(selected))}
                disabled={bulkArchiveMutation.isPending}
              >
                {bulkArchiveMutation.isPending ? "Archiving…" : "Archive selected"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="rounded-2xl border border-zinc-200/60 bg-white/70 p-4 shadow-sm backdrop-blur">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-4 md:flex-row md:min-w-max">
              {board.columns.map((column) => (
                <JobColumn
                  key={column.key}
                  column={column}
                  activeId={activeId}
                  onEdit={setEditingJob}
                  onRequestStatus={(job, status) => {
                    setStatusPrompt({ job, status });
                    setStatusNote("");
                  }}
                  onArchive={(job) => archiveMutation.mutate({ id: job.id })}
                  selected={selected}
                  onToggleSelected={(id, on) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (on) next.add(id);
                      else next.delete(id);
                      return next;
                    });
                  }}
                  showSelect={selectMode}
                />
              ))}
            </div>
          </DndContext>
          <ScrollBar orientation="horizontal" className="hidden md:flex" />
        </ScrollArea>

        <Sheet
          open={Boolean(editingJob)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingJob(null);
            }
          }}
        >
          <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl">
          <SheetHeader className="px-6 py-4">
            <SheetTitle>Edit Job</SheetTitle>
            <SheetDescription>
              Update core job details, assignment, and production notes.
            </SheetDescription>
          </SheetHeader>
            <div className="px-6 py-6">
              <Form {...form}>
                <form
                  id="job-edit-form"
                  className="space-y-5"
                  onSubmit={form.handleSubmit((values) => {
                    if (!editingJob) return;
                    updateMutation.mutate({ id: editingJob.id, values });
                    setEditingJob(null);
                  })}
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input autoFocus placeholder="Job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Optional description"
                            className="min-h-[80px]"
                            name={field.name}
                            ref={field.ref}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.value)}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => field.onChange(value as JobPriority)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jobPriorityValues.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {priorityLabels[value]}
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
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              placeholder="e.g. 5.5"
                              value={field.value ?? ""}
                              onChange={(event) => {
                                const value = event.target.value;
                                field.onChange(value === "" ? null : Number(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="printerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Printer assignment</FormLabel>
                        <Select
                          value={field.value === null || field.value === undefined ? "unassigned" : String(field.value)}
                          onValueChange={(value) => {
                            if (value === "unassigned") field.onChange(null);
                            else field.onChange(Number(value));
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select printer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {printerOptions.map((printer) => (
                              <SelectItem key={printer.id} value={String(printer.id)}>
                                {printer.name}
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Optional operator notes"
                            className="min-h-[80px]"
                            name={field.name}
                            ref={field.ref}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.value)}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
            <SheetFooter className="sticky bottom-0 gap-2 border-t border-zinc-200 bg-white/85 px-6 pb-4 pt-4 backdrop-blur">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingJob(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" form="job-edit-form" disabled={updateMutation.isPending}>
                Save changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Dialog
          open={Boolean(statusPrompt)}
          onOpenChange={(open) => {
            if (!open) {
              setStatusPrompt(null);
              setStatusNote("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update status</DialogTitle>
              <DialogDescription>
                {statusPrompt
                  ? `Set ${statusPrompt.job.title} to ${statusLabels[statusPrompt.status]}.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Optional note"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              className="min-h-[90px]"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStatusPrompt(null);
                  setStatusNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!statusPrompt) return;
                  statusMutation.mutate({
                    id: statusPrompt.job.id,
                    status: statusPrompt.status,
                    note: statusNote.trim() ? statusNote : undefined,
                  });
                  setStatusPrompt(null);
                  setStatusNote("");
                }}
                disabled={statusMutation.isPending}
              >
                Update status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone: MetricTone;
}) {
  return (
    <Card className={`border ${metricTones[tone]} bg-white/70 shadow-sm backdrop-blur`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium text-zinc-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
        {helper ? <p className="mt-1 text-xs text-zinc-500">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

function JobColumn({
  column,
  activeId,
  onEdit,
  onRequestStatus,
  onArchive,
  selected,
  onToggleSelected,
  showSelect,
}: {
  column: JobBoardClientColumn;
  activeId: number | null;
  onEdit: (job: JobCardClient | null) => void;
  onRequestStatus: (job: JobCardClient, status: JobStatus) => void;
  onArchive: (job: JobCardClient) => void;
  selected: Set<number>;
  onToggleSelected: (id: number, on: boolean) => void;
  showSelect: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `column:${column.key}`,
    data: { type: "column", columnKey: column.key },
  });

  return (
    <div className="flex w-full flex-col gap-4 md:w-80" ref={setNodeRef}>
      <Card className="border border-zinc-200/60 bg-white/75 shadow-sm backdrop-blur">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-800">
                {column.printerName}
              </CardTitle>
              <p className="text-xs text-zinc-500">
                {column.printerStatus === "UNASSIGNED"
                  ? "Awaiting assignment"
                  : `${column.metrics.queuedCount} queued · ${column.metrics.activeCount} running`}
              </p>
            </div>
            <Badge variant="outline" className="border-zinc-200 text-xs text-zinc-500">
              {column.jobs.length} jobs
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <SortableContext
            id={column.key}
            items={column.jobs.map((job) => job.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {column.jobs.length === 0 ? (
                <EmptyColumn />
              ) : (
                column.jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    columnKey={column.key}
                    active={activeId === job.id}
                    onEdit={() => onEdit(job)}
                    onRequestStatus={onRequestStatus}
                    onArchive={() => onArchive(job)}
                    selected={selected.has(job.id)}
                    onToggleSelected={(on) => onToggleSelected(job.id, on)}
                    showSelect={showSelect}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyColumn() {
  return (
    <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white/40 text-center text-xs text-zinc-400">
      <AlertCircle className="mb-2 h-4 w-4" />
      Drop jobs here
    </div>
  );
}

function JobCard({
  job,
  columnKey,
  active,
  onEdit,
  onRequestStatus,
  onArchive,
  selected,
  onToggleSelected,
  showSelect,
}: {
  job: JobCardClient;
  columnKey: string;
  active: boolean;
  onEdit: () => void;
  onRequestStatus: (job: JobCardClient, status: JobStatus) => void;
  onArchive: () => void;
  selected: boolean;
  onToggleSelected: (on: boolean) => void;
  showSelect: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: job.id,
    data: { type: "job", columnKey },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const actionButtons: Array<{
    status: JobStatus;
    icon: ComponentType<{ className?: string }>;
    label: string;
    disabled: boolean;
    visible: boolean;
  }> = [
    {
      status: "PRINTING",
      icon: Play,
      label: "Start printing",
      disabled: job.status === "PRINTING" || job.status === "COMPLETED",
      visible: job.status === "QUEUED" || job.status === "PAUSED",
    },
    {
      status: "PAUSED",
      icon: Pause,
      label: "Pause job",
      disabled: job.status !== "PRINTING",
      visible: job.status === "PRINTING",
    },
    {
      status: "COMPLETED",
      icon: Check,
      label: "Mark completed",
      disabled: job.status === "COMPLETED",
      visible: job.status !== "COMPLETED",
    },
    {
      status: "QUEUED",
      icon: RefreshCcw,
      label: "Return to queue",
      disabled: job.status === "QUEUED",
      visible: job.status !== "QUEUED",
    },
    {
      status: "CANCELLED",
      icon: X,
      label: "Cancel job",
      disabled: job.status === "CANCELLED",
      visible: job.status !== "CANCELLED",
    },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border border-zinc-200/70 bg-white/85 p-4 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-zinc-400/40 ${
        isDragging || active ? "ring-2 ring-zinc-400/40" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {showSelect ? (
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={selected}
              onChange={(e) => onToggleSelected(e.target.checked)}
              aria-label="Select job"
            />
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-zinc-800">{job.title}</h3>
            <p className="text-xs text-zinc-500">
              {job.clientName} · Invoice {job.invoiceNumber}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] ${priorityStyles[job.priority]}`}>
          {priorityLabels[job.priority]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <Badge className={`${statusStyles[job.status]} border-none text-[10px] font-medium`}>
          {statusLabels[job.status]}
        </Badge>
        {typeof job.estimatedHours === "number" ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {job.estimatedHours.toFixed(1)}h
          </span>
        ) : null}
        {job.startedAt ? (
          <span>
            Started {formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {actionButtons
            .filter((action) => action.visible)
            .map((action) => (
              <Tooltip key={action.status}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRequestStatus(job, action.status);
                    }}
                    disabled={action.disabled}
                  >
                    <action.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{action.label}</TooltipContent>
              </Tooltip>
            ))}
          {(job.status === "COMPLETED" || job.status === "CANCELLED") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(event) => {
                    event.stopPropagation();
                    onArchive();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive job</TooltipContent>
            </Tooltip>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit job</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
