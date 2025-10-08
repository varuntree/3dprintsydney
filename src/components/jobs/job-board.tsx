"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
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
import { DataCard } from "@/components/ui/data-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";
import { StatusBadge } from "@/components/ui/status-badge";
import type { JobCreationPolicyValue } from "@/lib/schemas/settings";
import type { SettingsPayload } from "@/components/settings/settings-form";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Pause,
  Play,
  RefreshCcw,
  Truck,
  X,
  Pencil,
  Package as PackageIcon,
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
  NORMAL: "border-border bg-surface-overlay text-muted-foreground",
  FAST_TRACK: "border-border bg-warning-subtle text-warning-foreground",
  URGENT: "border-border bg-danger-subtle text-destructive",
};

// Status labels - kept for dialog descriptions
const statusLabels: Record<JobStatus, string> = {
  QUEUED: "Queued",
  PRE_PROCESSING: "Pre-processing",
  IN_QUEUE: "In queue",
  PRINTING: "Printing",
  PAUSED: "Paused",
  PRINTING_COMPLETE: "Printing complete",
  POST_PROCESSING: "Post-processing",
  PACKAGING: "Packaging",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type JobActionDefinition = {
  status: JobStatus;
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone?: "default" | "danger";
};

function getJobActions(job: JobCardClient): JobActionDefinition[] {
  const actions: JobActionDefinition[] = [];

  switch (job.status) {
    case "PRE_PROCESSING":
      actions.push({ status: "IN_QUEUE", icon: ArrowRight, label: "Send to queue" });
      break;
    case "QUEUED":
    case "IN_QUEUE":
      actions.push({ status: "PRINTING", icon: Play, label: "Start printing" });
      break;
    case "PRINTING":
      actions.push({ status: "PRINTING_COMPLETE", icon: Check, label: "Mark print complete" });
      actions.push({ status: "PAUSED", icon: Pause, label: "Pause printing" });
      break;
    case "PAUSED":
      actions.push({ status: "PRINTING", icon: Play, label: "Resume printing" });
      actions.push({ status: "IN_QUEUE", icon: RefreshCcw, label: "Return to queue" });
      break;
    case "PRINTING_COMPLETE":
      actions.push({ status: "POST_PROCESSING", icon: ArrowRight, label: "Start post-processing" });
      break;
    case "POST_PROCESSING":
      actions.push({ status: "PACKAGING", icon: PackageIcon, label: "Move to packaging" });
      break;
    case "PACKAGING":
      actions.push({ status: "OUT_FOR_DELIVERY", icon: Truck, label: "Out for delivery" });
      break;
    case "OUT_FOR_DELIVERY":
      actions.push({ status: "COMPLETED", icon: Check, label: "Mark delivered" });
      break;
    case "COMPLETED":
      actions.push({ status: "IN_QUEUE", icon: RefreshCcw, label: "Return to queue" });
      break;
    case "CANCELLED":
      actions.push({ status: "IN_QUEUE", icon: RefreshCcw, label: "Re-open" });
      break;
    default:
      break;
  }

  if (job.status !== "PRE_PROCESSING" && job.status !== "IN_QUEUE" && job.status !== "QUEUED" && job.status !== "CANCELLED") {
    actions.push({ status: "IN_QUEUE", icon: RefreshCcw, label: "Return to queue" });
  }

  if (job.status !== "CANCELLED" && job.status !== "COMPLETED") {
    actions.push({ status: "CANCELLED", icon: X, label: "Cancel job", tone: "danger" });
  }

  const unique = new Map<JobStatus, JobActionDefinition>();
  actions.forEach((action) => {
    if (action.status !== job.status) {
      unique.set(action.status, action);
    }
  });

  return Array.from(unique.values());
}


const jobPolicyMeta: Record<
  JobCreationPolicyValue,
  { badge: string; description: string }
> = {
  ON_PAYMENT: {
    badge: "Jobs wait for payment",
    description: "Jobs are created once the invoice is marked as paid.",
  },
  ON_INVOICE: {
    badge: "Jobs create on invoice",
    description: "Jobs are created immediately when the invoice is issued.",
  },
};

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

function recalcColumns(
  columns: JobBoardClientColumn[],
): JobBoardClientColumn[] {
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

function resolveOverColumnKey(
  over: DragEndEvent["over"] | DragOverEvent["over"],
) {
  if (!over) return null;
  const data = over.data.current as
    | { type?: string; columnKey?: string }
    | undefined;
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
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [board, setBoard] = useState<JobBoardClientSnapshot>(initial);
  const [activeId, setActiveId] = useState<number | null>(null);
  const boardRef = useRef(board);
  const [editingJob, setEditingJob] = useState<JobCardClient | null>(null);
  const [statusPrompt, setStatusPrompt] = useState<{
    job: JobCardClient;
    status: JobStatus;
  } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  type ViewMode = "active" | "completed-today" | "archived" | "all";
  const [view, setView] = useState<ViewMode>("active");

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get("view");
      const allowed: ViewMode[] = [
        "active",
        "completed-today",
        "archived",
        "all",
      ];
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
      ["QUEUED", "PRINTING", "PAUSED"].forEach((s) =>
        params.append("status", s),
      );
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

  const boardQuery = useQuery({
    queryKey: ["jobs-board", view] as const,
    queryFn: () => getJson<JobBoardClientSnapshot>(buildJobsUrl(view)),
    initialData: initial,
    staleTime: 4_000,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"] as const,
    queryFn: () => getJson<SettingsPayload>("/api/settings"),
    staleTime: 60_000,
  });

  const jobPolicy: JobCreationPolicyValue =
    settingsQuery.data?.jobCreationPolicy ?? "ON_PAYMENT";

  useEffect(() => {
    if (boardQuery.data) {
      setBoard(boardQuery.data);
      boardRef.current = boardQuery.data;
    }
  }, [boardQuery.data]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const reorderMutation = useMutation({
    mutationFn: (
      entries: {
        id: number;
        queuePosition: number;
        printerId: number | null;
      }[],
    ) =>
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
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: number;
      status: JobStatus;
      note?: string;
    }) =>
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
      toast.error(
        error instanceof Error ? error.message : "Failed to update job",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Failed to archive job",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Failed to archive jobs",
      );
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
      const sourceJobIndex = sourceColumn.jobs.findIndex(
        (job) => job.id === id,
      );
      if (sourceJobIndex === -1) {
        return prev;
      }

      const existingJob = sourceColumn.jobs[sourceJobIndex];
      const updatedJob = updater(existingJob);
      sourceColumn.jobs[sourceJobIndex] = updatedJob;

      const targetColumnKey = columnKeyFor(updatedJob.printerId);
      const currentColumnKey = sourceColumn.key;

      if (targetColumnKey !== currentColumnKey) {
        const destinationColumn = columns.find(
          (column) => column.key === targetColumnKey,
        );
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
    const activeColumnKey = (
      active.data.current as { columnKey?: string } | undefined
    )?.columnKey;
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
    const activeColumnKey = (
      active.data.current as { columnKey?: string } | undefined
    )?.columnKey;
    if (!overColumnKey || !activeColumnKey) {
      setBoard(boardRef.current);
      return;
    }

    const updated = simulateMove(
      boardRef.current,
      activeId,
      overColumnKey,
      over,
    );
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
    const destinationColumn = columns.find(
      (column) => column.key === targetColumnKey,
    );
    if (!sourceColumn || !destinationColumn) return snapshot;

    const sourceIndex = sourceColumn.jobs.findIndex((job) => job.id === jobId);
    if (sourceIndex === -1) return snapshot;

    const overData = over?.data.current as { type?: string } | undefined;
    const overJobId =
      overData?.type === "job" && typeof over?.id === "number"
        ? Number(over.id)
        : null;

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
      const index = destinationColumn.jobs.findIndex(
        (job) => job.id === overJobId,
      );
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
        <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Jobs & Queue
              </h1>
              <p className="text-sm text-muted-foreground">
                Drag jobs between printers, adjust details, and update status as work progresses.
              </p>
              <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 mt-2">
                <span>{board.summary.active} active</span>
                <span>{board.summary.queued} queued</span>
                <span>{board.summary.printersWithWork} printers busy</span>
                {settingsQuery.isLoading ? (
                  <InlineLoader label="Loading policy…" className="text-[10px]" />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="border border-border bg-surface-overlay text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                      >
                        {jobPolicyMeta[jobPolicy].badge}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {jobPolicyMeta[jobPolicy].description}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <ActionRail align="start" wrap>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex w-full overflow-hidden rounded-full border border-input bg-background text-xs font-medium shadow-sm sm:w-auto">
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
                        "flex-1 px-3 py-1.5 transition rounded-full",
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
                  className="sm:shrink-0 rounded-full"
                >
                  {selectMode ? "Selecting…" : "Select"}
                </Button>
              </div>
            </ActionRail>
          </div>
        </header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataCard
            title="Total Jobs"
            value={board.summary.totalJobs}
            tone="slate"
          />
          <DataCard
            title="Queued"
            value={board.summary.queued}
            tone="slate"
          />
          <DataCard
            title="Active"
            value={board.summary.active}
            description={`${board.summary.printersWithWork} printer${board.summary.printersWithWork === 1 ? "" : "s"}`}
            tone="emerald"
          />
          <DataCard
            title="Est. Hours"
            value={board.summary.totalEstimatedHours.toFixed(1)}
            tone="sky"
          />
        </section>

        {(selected.size > 0 || selectMode) && (
          <div className="flex flex-col gap-2 rounded-3xl border border-border/60 bg-card/80 p-3 text-sm text-muted-foreground shadow-sm shadow-black/5 sm:flex-row sm:items-center">
            <span className="font-medium text-foreground">
              Selected: {selected.size}
            </span>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <LoadingButton
                size="sm"
                variant="outline"
                className="rounded-full"
                loading={bulkArchiveMutation.isPending}
                loadingText="Archiving…"
                disabled={selected.size === 0 || bulkArchiveMutation.isPending}
                onClick={() => bulkArchiveMutation.mutate(Array.from(selected))}
              >
                Archive selected
              </LoadingButton>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="rounded-3xl border border-border bg-surface-overlay p-4 shadow-sm">
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
          <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl rounded-3xl shadow-sm shadow-black/5">
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
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
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
                            onValueChange={(value) =>
                              field.onChange(value as JobPriority)
                            }
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
                                field.onChange(
                                  value === "" ? null : Number(value),
                                );
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
                          value={
                            field.value === null || field.value === undefined
                              ? "unassigned"
                              : String(field.value)
                          }
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
                            <SelectItem value="unassigned">
                              Unassigned
                            </SelectItem>
                            {printerOptions.map((printer) => (
                              <SelectItem
                                key={printer.id}
                                value={String(printer.id)}
                              >
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
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
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
            <SheetFooter className="sticky bottom-0 gap-2 border-t border-border bg-surface-overlay/90 px-6 pb-4 pt-4 backdrop-blur">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setEditingJob(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                form="job-edit-form"
                className="rounded-full"
                loading={updateMutation.isPending}
                loadingText="Saving…"
              >
                Save changes
              </LoadingButton>
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
          <DialogContent className="rounded-3xl shadow-sm shadow-black/5">
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
                className="rounded-full"
                onClick={() => {
                  setStatusPrompt(null);
                  setStatusNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full"
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
      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-sm shadow-black/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {column.printerName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {column.printerStatus === "UNASSIGNED"
                  ? "Awaiting assignment"
                  : `${column.metrics.queuedCount} queued · ${column.metrics.activeCount} running`}
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-border bg-surface-subtle text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
            >
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
    <div className="flex h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/50 text-center text-xs text-muted-foreground shadow-sm shadow-black/5">
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

  const jobActions = getJobActions(job);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        isDragging || active ? "ring-2 ring-primary/40" : "",
      )}
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
            <h3 className="text-sm font-semibold text-foreground">
              {job.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {job.clientName} · Invoice {job.invoiceNumber}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.2em]",
            priorityStyles[job.priority],
          )}
        >
          {priorityLabels[job.priority]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge
          status={job.status}
          variant="default"
          size="sm"
          className="text-[10px] font-medium uppercase tracking-[0.2em]"
        />
        {typeof job.estimatedHours === "number" ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {job.estimatedHours.toFixed(1)}h
          </span>
        ) : null}
        {job.startedAt ? (
          <span>
            Started{" "}
            {formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {jobActions.map((action) => (
            <Tooltip key={action.status}>
              <TooltipTrigger asChild>
                <Button
                  variant={action.tone === "danger" ? "destructive" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRequestStatus(job, action.status);
                  }}
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
                  className="h-8 w-8 rounded-full"
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
              className="h-8 w-8 rounded-full"
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
