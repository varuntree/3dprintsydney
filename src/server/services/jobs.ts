import { logger } from "@/lib/logger";
import { getSettings } from "@/server/services/settings";
import {
  InvoiceStatus,
  JobCreationPolicy,
  JobPriority,
  JobStatus,
  PrinterStatus,
} from "@/lib/constants/enums";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, NotFoundError, BadRequestError, ConflictError } from "@/lib/errors";
import type {
  JobCardDTO,
  JobBoardColumnDTO,
  JobBoardSnapshotDTO,
  JobFilters,
} from '@/lib/types/jobs';

type BoardFilters = JobFilters;

type SettingsOptions = {
  autoDetachJobOnComplete: boolean;
  autoArchiveCompletedJobsAfterDays: number;
  preventAssignToOffline: boolean;
  preventAssignToMaintenance: boolean;
  maxActivePrintingPerPrinter: number;
};

type PrinterRow = {
  id: number;
  name: string;
  status: string;
};

type ClientRow = {
  id: number;
  name: string | null;
  email?: string | null;
  notify_on_job_status?: boolean | null;
};

type InvoiceRow = {
  id: number;
  number: string | null;
  status: string | null;
};

type JobRow = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  printer_id: number | null;
  client_id: number;
  invoice_id: number;
  queue_position: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: string | number | null;
  actual_hours: string | number | null;
  notes: string | null;
  paused_at: string | null;
  last_run_started_at: string | null;
  updated_at: string;
  archived_at: string | null;
  archived_reason: string | null;
  completed_by: string | null;
};

type JobWithRelationsRow = JobRow & {
  printers?: PrinterRow | null;
  clients?: ClientRow | null;
  invoices?: InvoiceRow | null;
};

type JobForNotification = JobWithRelationsRow & {
  clients?: (ClientRow & { notify_on_job_status?: boolean | null; email?: string | null }) | null;
  invoices?: InvoiceRow | null;
};

type ClientJobSummary = {
  id: number;
  title: string;
  status: JobStatus;
  priority: JobPriority;
  invoiceId: number;
  invoiceNumber: string;
  updatedAt: Date;
  createdAt: Date;
};

const QUEUED_STATUSES: ReadonlySet<JobStatus> = new Set([
  JobStatus.QUEUED,
  JobStatus.PRE_PROCESSING,
  JobStatus.IN_QUEUE,
]);

const ACTIVE_STATUSES: ReadonlySet<JobStatus> = new Set([JobStatus.PRINTING]);

const POST_PRINT_STATUSES: ReadonlySet<JobStatus> = new Set([
  JobStatus.PRINTING_COMPLETE,
  JobStatus.POST_PROCESSING,
  JobStatus.PACKAGING,
  JobStatus.OUT_FOR_DELIVERY,
]);

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapJobCard(row: JobWithRelationsRow): JobCardDTO {
  const printer = row.printers ?? null;
  const client = row.clients ?? null;
  const invoice = row.invoices ?? null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: (row.status ?? JobStatus.QUEUED) as JobStatus,
    priority: (row.priority ?? JobPriority.NORMAL) as JobPriority,
    printerId: row.printer_id,
    printerName: printer?.name ?? null,
    queuePosition: row.queue_position,
    clientName: client?.name ?? "",
    invoiceId: row.invoice_id,
    invoiceNumber: invoice?.number ?? "",
    invoiceStatus: (invoice?.status ?? InvoiceStatus.PENDING) as InvoiceStatus,
    createdAt: new Date(row.created_at),
    startedAt: toDate(row.started_at),
    completedAt: toDate(row.completed_at),
    estimatedHours: toNumber(row.estimated_hours),
    actualHours: toNumber(row.actual_hours),
    notes: row.notes,
  };
}

function mapClientJob(row: JobWithRelationsRow): ClientJobSummary {
  const invoice = row.invoices ?? null;
  return {
    id: row.id,
    title: row.title,
    status: (row.status ?? JobStatus.QUEUED) as JobStatus,
    priority: (row.priority ?? JobPriority.NORMAL) as JobPriority,
    invoiceId: row.invoice_id,
    invoiceNumber: invoice?.number ?? "",
    updatedAt: new Date(row.updated_at),
    createdAt: new Date(row.created_at),
  };
}

async function getOpsSettings(): Promise<SettingsOptions> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("settings")
    .select(
      "auto_detach_job_on_complete, auto_archive_completed_jobs_after_days, prevent_assign_to_offline, prevent_assign_to_maintenance, max_active_printing_per_printer",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load ops settings: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return {
    autoDetachJobOnComplete: data?.auto_detach_job_on_complete ?? true,
    autoArchiveCompletedJobsAfterDays: data?.auto_archive_completed_jobs_after_days ?? 7,
    preventAssignToOffline: data?.prevent_assign_to_offline ?? true,
    preventAssignToMaintenance: data?.prevent_assign_to_maintenance ?? true,
    maxActivePrintingPerPrinter: data?.max_active_printing_per_printer ?? 1,
  };
}

async function ensurePrinterAssignable(printerId: number | null | undefined) {
  if (printerId === null || printerId === undefined) return;

  const [settings, printer] = await Promise.all([
    getOpsSettings(),
    getServiceSupabase()
      .from("printers")
      .select("id, status")
      .eq("id", printerId)
      .maybeSingle(),
  ]);

  if (printer.error) {
    throw new AppError(`Printer lookup failed: ${printer.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!printer.data) {
    throw new NotFoundError("Printer", printerId);
  }

  const status = (printer.data.status ?? "ACTIVE") as PrinterStatus;
  if (settings.preventAssignToOffline && status === PrinterStatus.OFFLINE) {
    throw new BadRequestError("Assignment blocked: printer is offline");
  }
  if (settings.preventAssignToMaintenance && status === PrinterStatus.MAINTENANCE) {
    throw new BadRequestError("Assignment blocked: printer in maintenance");
  }
}

function applyCompletedTodayMetric(card: JobCardDTO, today: Date): boolean {
  if (!card.completedAt) return false;
  return (
    card.completedAt.getFullYear() === today.getFullYear() &&
    card.completedAt.getMonth() === today.getMonth() &&
    card.completedAt.getDate() === today.getDate()
  );
}

/**
 * Retrieves the job board snapshot with all columns and summary metrics
 * @param filters - Optional filters for the job board
 * @returns Complete job board snapshot with columns and summary
 * @throws AppError if database query fails
 */
export async function getJobBoard(filters: BoardFilters = {}): Promise<JobBoardSnapshotDTO> {
  const supabase = getServiceSupabase();

  let jobsQuery = supabase
    .from("jobs")
    .select(
      "*, printers(id, name, status), clients(id, name), invoices(id, number, status)",
    )
    .order("queue_position", { ascending: true });

  if (!filters.includeArchived) {
    jobsQuery = jobsQuery.is("archived_at", null);
  }
  if (filters.statuses && filters.statuses.length > 0) {
    jobsQuery = jobsQuery.in("status", filters.statuses);
  }
  if (filters.completedSince) {
    jobsQuery = jobsQuery.gte("completed_at", filters.completedSince.toISOString());
  }

  const [printersRes, jobsRes] = await Promise.all([
    supabase.from("printers").select("id, name, status").order("name", { ascending: true }),
    jobsQuery,
  ]);

  if (printersRes.error) {
    throw new AppError(`Failed to load printers: ${printersRes.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (jobsRes.error) {
    throw new AppError(`Failed to load jobs: ${jobsRes.error.message}`, 'DATABASE_ERROR', 500);
  }

  const printerRows: PrinterRow[] = printersRes.data ?? [];
  const jobRows: JobWithRelationsRow[] = jobsRes.data ?? [];

  const cards = jobRows.map(mapJobCard);
  const columnMap = new Map<number | null, JobBoardColumnDTO>();

  columnMap.set(null, {
    key: "unassigned",
    printerId: null,
    printerName: "Unassigned",
    printerStatus: "UNASSIGNED",
    jobs: [],
    metrics: { queuedCount: 0, activeCount: 0, totalEstimatedHours: 0 },
  });

  printerRows.forEach((printer) => {
    columnMap.set(printer.id, {
      key: `printer-${printer.id}`,
      printerId: printer.id,
      printerName: printer.name,
      printerStatus: (printer.status ?? PrinterStatus.ACTIVE) as PrinterStatus,
      jobs: [],
      metrics: { queuedCount: 0, activeCount: 0, totalEstimatedHours: 0 },
    });
  });

  cards.forEach((card) => {
    const column = columnMap.get(card.printerId ?? null);
    if (!column) return;
    column.jobs.push(card);
    if (QUEUED_STATUSES.has(card.status)) {
      column.metrics.queuedCount += 1;
    }
    if (ACTIVE_STATUSES.has(card.status)) {
      column.metrics.activeCount += 1;
    }
    if (typeof card.estimatedHours === "number") {
      column.metrics.totalEstimatedHours += card.estimatedHours;
    }
  });

  const today = new Date();
  const columns = Array.from(columnMap.values()).map((column) => ({
    ...column,
    jobs: column.jobs.sort((a, b) => a.queuePosition - b.queuePosition),
    metrics: {
      queuedCount: column.metrics.queuedCount,
      activeCount: column.metrics.activeCount,
      totalEstimatedHours: Number(column.metrics.totalEstimatedHours.toFixed(2)),
    },
  }));

  const summary = columns.reduce(
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
      const completedToday = column.jobs.filter((job) =>
        applyCompletedTodayMetric(job, today),
      ).length;
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

  summary.totalEstimatedHours = Number(summary.totalEstimatedHours.toFixed(2));

  return { columns, summary };
}

async function getMaxQueuePosition(printerId: number | null): Promise<number> {
  const supabase = getServiceSupabase();
  const query =
    printerId === null
      ? supabase.from("jobs").select("queue_position").is("printer_id", null)
      : supabase.from("jobs").select("queue_position").eq("printer_id", printerId);
  const { data, error } = await query
    .order("queue_position", { ascending: false })
    .limit(1);
  if (error) {
    throw new AppError(`Failed to compute queue position: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return data?.[0]?.queue_position ?? -1;
}

async function fetchJobWithRelations(id: number): Promise<JobWithRelationsRow> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "*, clients(id, name, email, notify_on_job_status), invoices(id, number, status), printers(id, name, status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new AppError(`Failed to load job: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError("Job", id);
  }
  return data as JobWithRelationsRow;
}

/**
 * Ensures a job exists for the given invoice, creating one if necessary
 * @param invoiceId - The invoice ID to ensure job for
 * @returns The job record with full relations
 * @throws AppError if database operations fail
 * @throws NotFoundError if invoice not found
 */
export async function ensureJobForInvoice(invoiceId: number) {
  const supabase = getServiceSupabase();
  const invoiceRes = await supabase
    .from("invoices")
    .select(
      "id, number, client_id, clients(name), invoice_items(name, description)",
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceRes.error) {
    throw new AppError(`Failed to load invoice: ${invoiceRes.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!invoiceRes.data) {
    throw new NotFoundError("Invoice", invoiceId);
  }

  const existing = await supabase
    .from("jobs")
    .select("id")
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (existing.data) {
    return fetchJobWithRelations(existing.data.id);
  }

  const lastPosition = await getMaxQueuePosition(null);
  const nextPosition = lastPosition + 1;

  const hasFastTrackLine =
    invoiceRes.data.invoice_items?.some((item) => {
      const haystacks = [item?.name, item?.description]
        .filter(Boolean)
        .map((value) => (value ?? "").toLowerCase());
      return haystacks.some((text) => text.includes("fast track"));
    }) ?? false;

  const { data: created, error: createError } = await supabase
    .from("jobs")
    .insert({
      invoice_id: invoiceRes.data.id,
      client_id: invoiceRes.data.client_id,
      title: `Invoice ${invoiceRes.data.number}`,
      description: null,
      status: JobStatus.PRE_PROCESSING,
      priority: hasFastTrackLine ? JobPriority.FAST_TRACK : JobPriority.NORMAL,
      printer_id: null,
      queue_position: nextPosition,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new AppError(`Failed to create job: ${createError?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const activityError = await supabase.from("activity_logs").insert({
    client_id: invoiceRes.data.client_id,
    invoice_id: invoiceRes.data.id,
    job_id: created.id,
    action: "JOB_CREATED",
    message: `Job created for invoice ${invoiceRes.data.number}`,
  });
  if (activityError.error) {
    logger.warn({
      scope: "jobs.ensure.activity",
      message: "Failed to record job creation activity",
      error: activityError.error,
      data: { invoiceId },
    });
  }

  logger.info({ scope: "jobs.ensure", data: { invoiceId, jobId: created.id } });
  return fetchJobWithRelations(created.id);
}

/**
 * Lists all jobs for a specific client
 * @param clientId - The client ID
 * @param options - Optional filters
 * @returns Array of client job summaries
 * @throws AppError if database query fails
 */
export async function listJobsForClient(
  clientId: number,
  options?: { includeArchived?: boolean },
): Promise<ClientJobSummary[]> {
  const supabase = getServiceSupabase();
  const query = supabase
    .from("jobs")
    .select("*, invoices(id, number)")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (!options?.includeArchived) {
    query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list jobs: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return (data as JobWithRelationsRow[]).map(mapClientJob);
}

/**
 * Updates job details and optionally reassigns to a different printer
 * @param id - The job ID
 * @param updates - Fields to update
 * @returns Updated job record with relations
 * @throws AppError if database update fails
 * @throws NotFoundError if job not found
 */
export async function updateJob(
  id: number,
  updates: {
    printerId?: number | null;
    priority?: JobPriority;
    title?: string;
    description?: string | null;
    estimatedHours?: number | null;
    notes?: string | null;
  },
) {
  const supabase = getServiceSupabase();
  const existing = await fetchJobWithRelations(id);

  let queuePosition: number | undefined;
  const targetPrinterId = updates.printerId ?? existing.printer_id;

  if (updates.printerId !== undefined && updates.printerId !== existing.printer_id) {
    await ensurePrinterAssignable(updates.printerId);
    const maxPosition = await getMaxQueuePosition(targetPrinterId ?? null);
    queuePosition = maxPosition + 1;
  }

  const normalizeText = (value: string | null | undefined) => {
    if (value === undefined) return undefined;
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  const { error } = await supabase
    .from("jobs")
    .update({
      printer_id: updates.printerId ?? undefined,
      queue_position: queuePosition ?? undefined,
      priority: updates.priority ?? undefined,
      title: updates.title ?? undefined,
      description: normalizeText(updates.description ?? undefined),
      estimated_hours:
        updates.estimatedHours === undefined ? undefined : updates.estimatedHours,
      notes: normalizeText(updates.notes ?? undefined),
    })
    .eq("id", id);

  if (error) {
    throw new AppError(`Failed to update job: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  logger.info({ scope: "jobs.update", data: { id } });
  return fetchJobWithRelations(id);
}

/**
 * Updates job status and handles automatic state transitions
 * @param id - The job ID
 * @param status - The new status
 * @param note - Optional note for the status change
 * @returns Updated job record with relations
 * @throws AppError if database update fails
 * @throws BadRequestError if status transition is invalid
 * @throws ConflictError if printer capacity exceeded
 * @throws NotFoundError if job not found
 */
export async function updateJobStatus(id: number, status: JobStatus, note?: string) {
  const supabase = getServiceSupabase();
  const jobRecord = await fetchJobWithRelations(id);
  const now = new Date();
  const settings = await getOpsSettings();

  const updates: Record<string, unknown> = { status };

  const accumulateRun = async () => {
    if (jobRecord.last_run_started_at) {
      const lastRunStart = new Date(jobRecord.last_run_started_at);
      const deltaHours = Math.max(
        (now.getTime() - lastRunStart.getTime()) / 3_600_000,
        0,
      );
      const accumulated = Number(
        ((toNumber(jobRecord.actual_hours) ?? 0) + deltaHours).toFixed(2),
      );
      updates.actual_hours = accumulated;
      updates.last_run_started_at = null;
    }
  };

  if (status === JobStatus.PRINTING) {
    if (!jobRecord.printer_id) {
      throw new BadRequestError("Cannot start printing without a printer assignment");
    }
    await ensurePrinterAssignable(jobRecord.printer_id);
    const { count, error: countError } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("printer_id", jobRecord.printer_id)
      .eq("status", JobStatus.PRINTING);
    if (countError) {
      throw new AppError(`Failed to inspect active jobs: ${countError.message}`, 'DATABASE_ERROR', 500);
    }
    if ((count ?? 0) >= settings.maxActivePrintingPerPrinter) {
      throw new ConflictError("Printer is busy: active job limit reached");
    }
    updates.started_at = jobRecord.started_at ?? now.toISOString();
    updates.paused_at = null;
    updates.last_run_started_at = jobRecord.last_run_started_at ?? now.toISOString();
  } else if (status === JobStatus.PAUSED) {
    await accumulateRun();
    updates.paused_at = now.toISOString();
  } else if (status === JobStatus.COMPLETED) {
    await accumulateRun();
    updates.completed_at = now.toISOString();
    if (!jobRecord.started_at) {
      updates.started_at = now.toISOString();
    }
    updates.paused_at = null;
    updates.completed_by = jobRecord.completed_by ?? "operator";
    if (settings.autoDetachJobOnComplete) {
      const maxPosition = await getMaxQueuePosition(null);
      updates.printer_id = null;
      updates.queue_position = maxPosition + 1;
    }
    if (settings.autoArchiveCompletedJobsAfterDays === 0) {
      updates.archived_at = now.toISOString();
      updates.archived_reason = "auto-archive (immediate)";
    }
  } else if (QUEUED_STATUSES.has(status)) {
    updates.started_at = null;
    updates.completed_at = null;
    updates.paused_at = null;
    updates.actual_hours = null;
    updates.last_run_started_at = null;
  } else if (POST_PRINT_STATUSES.has(status)) {
    await accumulateRun();
    updates.paused_at = null;
    updates.last_run_started_at = null;
  } else if (status === JobStatus.CANCELLED) {
    updates.completed_at = null;
    updates.paused_at = null;
    updates.actual_hours = null;
    updates.last_run_started_at = null;
    updates.printer_id = null;
    updates.archived_at = now.toISOString();
    updates.archived_reason = note ?? "cancelled";
  }

  const previousStatus = (jobRecord.status ?? JobStatus.QUEUED) as JobStatus;

  const { error } = await supabase.from("jobs").update(updates).eq("id", id);
  if (error) {
    throw new AppError(`Failed to update job status: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const activityError = await supabase.from("activity_logs").insert({
    client_id: jobRecord.client_id,
    job_id: jobRecord.id,
    invoice_id: jobRecord.invoice_id,
    action: "JOB_STATUS",
    message: `Job status updated to ${status}`,
    metadata: note ? { note } : null,
  });
  if (activityError.error) {
    logger.warn({
      scope: "jobs.status.activity",
      message: "Failed to record job status activity",
      error: activityError.error,
      data: { id },
    });
  }

  const updatedJob = await fetchJobWithRelations(id);
  await maybeNotifyJobStatusChange(previousStatus, updatedJob as JobForNotification, note);

  logger.info({ scope: "jobs.status", data: { id, status } });
  return updatedJob;
}

/**
 * Clears all queued and paused jobs from a printer, moving them to unassigned
 * @param printerId - The printer ID
 * @throws AppError if database operations fail
 */
export async function clearPrinterQueue(printerId: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("printer_id", printerId)
    .in("status", [JobStatus.QUEUED, JobStatus.PAUSED])
    .order("queue_position", { ascending: true });
  if (error) {
    throw new AppError(`Failed to load printer queue: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const queue = data ?? [];
  if (queue.length === 0) {
    logger.info({ scope: "jobs.printer.clear_queue", data: { printerId, count: 0 } });
    return;
  }

  const basePosition = (await getMaxQueuePosition(null)) + 1;
  let nextPosition = basePosition;
  const timestamp = new Date().toISOString();

  for (const job of queue) {
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        printer_id: null,
        queue_position: nextPosition,
        updated_at: timestamp,
      })
      .eq("id", job.id);
    if (updateError) {
      throw new AppError(`Failed to detach job ${job.id}: ${updateError.message}`, 'DATABASE_ERROR', 500);
    }
    nextPosition += 1;
  }

  logger.info({ scope: "jobs.printer.clear_queue", data: { printerId, count: queue.length } });
}

/**
 * Reorders jobs by updating queue positions and printer assignments
 * @param entries - Array of job reorder entries
 * @throws AppError if database operations fail
 */
export async function reorderJobs(entries: { id: number; queuePosition: number; printerId: number | null }[]) {
  const supabase = getServiceSupabase();
  for (const entry of entries) {
    await ensurePrinterAssignable(entry.printerId ?? null);
  }
  await Promise.all(
    entries.map((entry) =>
      supabase
        .from("jobs")
        .update({
          queue_position: entry.queuePosition,
          printer_id: entry.printerId,
        })
        .eq("id", entry.id),
    ),
  );
  logger.info({ scope: "jobs.reorder", data: { count: entries.length } });
}

/**
 * Retrieves the current job creation policy setting
 * @returns The job creation policy
 * @throws AppError if database query fails
 */
export async function getJobCreationPolicy(): Promise<JobCreationPolicy> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("settings")
    .select("job_creation_policy")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    throw new AppError(`Failed to read job creation policy: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return (data?.job_creation_policy ?? JobCreationPolicy.ON_PAYMENT) as JobCreationPolicy;
}

/**
 * Archives a job with an optional reason
 * @param id - The job ID
 * @param reason - Optional archive reason
 * @returns The archived job record with relations
 * @throws AppError if database update fails
 */
export async function archiveJob(id: number, reason?: string) {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("jobs")
    .update({
      archived_at: new Date().toISOString(),
      archived_reason: reason ?? null,
    })
    .eq("id", id);
  if (error) {
    throw new AppError(`Failed to archive job: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const job = await fetchJobWithRelations(id);
  const activityError = await supabase.from("activity_logs").insert({
    client_id: job.client_id,
    job_id: job.id,
    invoice_id: job.invoice_id,
    action: "JOB_ARCHIVED",
    message: `Job ${job.title} archived`,
    metadata: reason ? { reason } : null,
  });
  if (activityError.error) {
    logger.warn({
      scope: "jobs.archive.activity",
      message: "Failed to record job archive activity",
      error: activityError.error,
      data: { id },
    });
  }
  return job;
}

/**
 * Archives multiple jobs in bulk with an optional reason
 * @param ids - Array of job IDs to archive
 * @param reason - Optional archive reason
 * @returns Number of jobs archived
 * @throws AppError if database update fails
 */
export async function bulkArchiveJobs(ids: number[], reason?: string) {
  if (ids.length === 0) return 0;
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("jobs")
    .update({
      archived_at: new Date().toISOString(),
      archived_reason: reason ?? null,
    })
    .in("id", ids);
  if (error) {
    throw new AppError(`Failed to bulk archive jobs: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  logger.info({ scope: "jobs.archive.bulk", data: { count: ids.length } });
  return ids.length;
}

async function maybeNotifyJobStatusChange(
  previousStatus: JobStatus,
  job: JobForNotification,
  note?: string,
) {
  const currentStatus = (job.status ?? JobStatus.QUEUED) as JobStatus;
  if (previousStatus === currentStatus) return;

  const settings = await getSettings();
  if (!settings?.enableEmailSend) {
    logger.info({
      scope: "jobs.notify",
      message: "Email notifications disabled; skipping job status email",
      data: { jobId: job.id, status: currentStatus },
    });
    return;
  }

  const client = job.clients ?? null;
  if (!client?.notify_on_job_status) {
    logger.info({
      scope: "jobs.notify",
      message: "Client opted out of job status emails",
      data: { jobId: job.id, clientId: job.client_id },
    });
    return;
  }

  logger.info({
    scope: "jobs.notify",
    message: "Dispatching job status notification",
    data: {
      jobId: job.id,
      clientId: job.client_id,
      clientEmail: client.email ?? null,
      invoiceNumber: job.invoices?.number ?? null,
      previousStatus,
      newStatus: currentStatus,
      note: note ?? null,
    },
  });
  // Future: integrate email delivery
}
