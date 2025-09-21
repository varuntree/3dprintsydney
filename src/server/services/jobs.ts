import {
  InvoiceStatus,
  JobCreationPolicy,
  JobPriority,
  JobStatus,
  PrinterStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";
type HttpError = Error & { status?: number };

export type JobCard = {
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
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  notes: string | null;
};

export type JobBoardColumn = {
  key: string;
  printerId: number | null;
  printerName: string;
  printerStatus: PrinterStatus | "UNASSIGNED";
  jobs: JobCard[];
  metrics: {
    queuedCount: number;
    activeCount: number;
    totalEstimatedHours: number;
  };
};

export type JobBoardSnapshot = {
  columns: JobBoardColumn[];
  summary: {
    totalJobs: number;
    queued: number;
    active: number;
    completedToday: number;
    unassigned: number;
    totalEstimatedHours: number;
    printersWithWork: number;
  };
};

type BoardFilters = {
  includeArchived?: boolean;
  completedSince?: Date | null;
  statuses?: JobStatus[] | null;
};

async function getOpsSettings() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return {
    autoDetachJobOnComplete: s?.autoDetachJobOnComplete ?? true,
    autoArchiveCompletedJobsAfterDays: s?.autoArchiveCompletedJobsAfterDays ?? 7,
    preventAssignToOffline: s?.preventAssignToOffline ?? true,
    preventAssignToMaintenance: s?.preventAssignToMaintenance ?? true,
    maxActivePrintingPerPrinter: s?.maxActivePrintingPerPrinter ?? 1,
  };
}

export async function getJobBoard(filters: BoardFilters = {}): Promise<JobBoardSnapshot> {
  const [printers, jobs] = await Promise.all([
    prisma.printer.findMany({ orderBy: { name: "asc" } }),
    prisma.job.findMany({
      orderBy: { queuePosition: "asc" },
      include: {
        printer: true,
        client: { select: { name: true } },
        invoice: { select: { number: true, status: true } },
      },
      where: {
        archivedAt: filters.includeArchived ? undefined : null,
        status: filters.statuses ? { in: filters.statuses } : undefined,
        ...(filters.completedSince
          ? { completedAt: { gte: filters.completedSince } }
          : {}),
      },
    }),
  ]);

  const cards: JobCard[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    status: job.status,
    priority: job.priority,
    printerId: job.printerId,
    printerName: job.printer?.name ?? null,
    queuePosition: job.queuePosition,
    clientName: job.client.name,
    invoiceId: job.invoiceId,
    invoiceNumber: job.invoice.number,
    invoiceStatus: job.invoice.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    estimatedHours: job.estimatedHours,
    actualHours: job.actualHours,
    notes: job.notes ?? null,
  }));

  const columnMap = new Map<number | null, JobBoardColumn>();

  const unassigned: JobBoardColumn = {
    key: "unassigned",
    printerId: null,
    printerName: "Unassigned",
    printerStatus: "UNASSIGNED",
    jobs: [],
    metrics: {
      queuedCount: 0,
      activeCount: 0,
      totalEstimatedHours: 0,
    },
  };

  columnMap.set(null, unassigned);

  printers.forEach((printer) => {
    columnMap.set(printer.id, {
      key: `printer-${printer.id}`,
      printerId: printer.id,
      printerName: printer.name,
      printerStatus: printer.status,
      jobs: [],
      metrics: {
        queuedCount: 0,
        activeCount: 0,
        totalEstimatedHours: 0,
      },
    });
  });

  cards.forEach((job) => {
    const column = columnMap.get(job.printerId ?? null);
    if (!column) {
      return;
    }
    column.jobs.push(job);
    if (job.status === JobStatus.QUEUED) {
      column.metrics.queuedCount += 1;
    }
    if (job.status === JobStatus.PRINTING) {
      column.metrics.activeCount += 1;
    }
    if (typeof job.estimatedHours === "number") {
      column.metrics.totalEstimatedHours += job.estimatedHours;
    }
  });

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
      const completedToday = column.jobs.filter((job) => {
        if (!job.completedAt) return false;
        const today = new Date();
        return (
          job.completedAt.getFullYear() === today.getFullYear() &&
          job.completedAt.getMonth() === today.getMonth() &&
          job.completedAt.getDate() === today.getDate()
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

  summary.totalEstimatedHours = Number(summary.totalEstimatedHours.toFixed(2));

  return { columns, summary };
}

async function ensurePrinterAssignable(printerId: number | null | undefined) {
  if (printerId === null || printerId === undefined) return;
  const [settings, printer] = await Promise.all([
    getOpsSettings(),
    prisma.printer.findUnique({ where: { id: printerId } }),
  ]);
  if (!printer) throw new Error("Printer not found");
  if (settings.preventAssignToOffline && printer.status === "OFFLINE") {
    const err: HttpError = new Error("Assignment blocked: printer is offline");
    err.status = 422;
    throw err;
  }
  if (settings.preventAssignToMaintenance && printer.status === "MAINTENANCE") {
    const err: HttpError = new Error("Assignment blocked: printer in maintenance");
    err.status = 422;
    throw err;
  }
}

export async function ensureJobForInvoice(invoiceId: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { name: true } } },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const existing = await prisma.job.findFirst({ where: { invoiceId } });
  if (existing) {
    return existing;
  }

  const aggregate = await prisma.job.aggregate({
    where: { printerId: null },
    _max: { queuePosition: true },
  });
  const nextPosition = (aggregate._max.queuePosition ?? -1) + 1;

  const created = await prisma.job.create({
    data: {
      invoiceId,
      clientId: invoice.clientId,
      title: `Invoice ${invoice.number}`,
      description: null,
      status: JobStatus.QUEUED,
      priority: JobPriority.NORMAL,
      printerId: null,
      queuePosition: nextPosition,
    },
  });

  await prisma.activityLog.create({
    data: {
      clientId: invoice.clientId,
      invoiceId,
      jobId: created.id,
      action: "JOB_CREATED",
      message: `Job created for invoice ${invoice.number}`,
    },
  });

  logger.info({ scope: "jobs.ensure", data: { invoiceId, jobId: created.id } });

  return created;
}

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
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Job not found");
  }

  let queuePosition: number | undefined;

  if (updates.printerId !== undefined && updates.printerId !== existing.printerId) {
    await ensurePrinterAssignable(updates.printerId);
    const aggregate = await prisma.job.aggregate({
      where: { printerId: updates.printerId ?? null, id: { not: id } },
      _max: { queuePosition: true },
    });
    queuePosition = (aggregate._max.queuePosition ?? -1) + 1;
  }

  const normalizeText = (value: string | null | undefined) => {
    if (value === undefined) return undefined;
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  const job = await prisma.job.update({
    where: { id },
    data: {
      printerId: updates.printerId ?? undefined,
      queuePosition,
      priority: updates.priority ?? undefined,
      title: updates.title ?? undefined,
      description: normalizeText(updates.description ?? undefined),
      estimatedHours:
        updates.estimatedHours === undefined
          ? undefined
          : updates.estimatedHours,
      notes: normalizeText(updates.notes ?? undefined),
    },
  });

  logger.info({ scope: "jobs.update", data: { id } });
  return job;
}

export async function updateJobStatus(
  id: number,
  status: JobStatus,
  note?: string,
) {
  const jobRecord = await prisma.job.findUnique({ where: { id } });
  if (!jobRecord) {
    throw new Error("Job not found");
  }

  const now = new Date();
  const settings = await getOpsSettings();

  const data: Prisma.JobUncheckedUpdateInput = { status };

  async function accumulateRun(record = jobRecord!) {
    if (record.lastRunStartedAt) {
      const delta = Math.max(
        (now.getTime() - record.lastRunStartedAt.getTime()) / 3_600_000,
        0,
      );
      const accumulated = Number(((record.actualHours ?? 0) + delta).toFixed(2));
      data.actualHours = accumulated;
      data.lastRunStartedAt = null;
    }
  }

  if (status === JobStatus.PRINTING) {
    if (!jobRecord.printerId) {
      const err: HttpError = new Error("Cannot start printing without a printer assignment");
      err.status = 422;
      throw err;
    }
    await ensurePrinterAssignable(jobRecord.printerId);
    // Enforce max active per printer
    const activeCount = await prisma.job.count({
      where: { printerId: jobRecord.printerId, status: JobStatus.PRINTING },
    });
    if (activeCount >= settings.maxActivePrintingPerPrinter) {
      const err: HttpError = new Error("Printer is busy: active job limit reached");
      err.status = 409;
      throw err;
    }
    data.startedAt = jobRecord.startedAt ?? now;
    data.pausedAt = null;
    data.lastRunStartedAt = jobRecord.lastRunStartedAt ?? now;
  }
  if (status === JobStatus.PAUSED) {
    await accumulateRun();
    data.pausedAt = now;
  }
  if (status === JobStatus.COMPLETED) {
    await accumulateRun();
    data.completedAt = now;
    if (!jobRecord.startedAt) {
      data.startedAt = now;
    }
    data.pausedAt = null;
    data.completedBy = "operator";

    if (settings.autoDetachJobOnComplete) {
      // Move to unassigned tail
      const aggregate = await prisma.job.aggregate({
        where: { printerId: null, id: { not: id } },
        _max: { queuePosition: true },
      });
      const nextPosition = (aggregate._max.queuePosition ?? -1) + 1;
      data.printerId = null;
      data.queuePosition = nextPosition;
    }

    if (settings.autoArchiveCompletedJobsAfterDays === 0) {
      data.archivedAt = now;
      data.archivedReason = "auto-archive (immediate)";
    }
  }
  if (status === JobStatus.QUEUED) {
    data.startedAt = null;
    data.completedAt = null;
    data.pausedAt = null;
    data.actualHours = null;
    data.lastRunStartedAt = null;
  }
  if (status === JobStatus.CANCELLED) {
    data.completedAt = null;
    data.pausedAt = null;
    data.actualHours = null;
    data.lastRunStartedAt = null;
    data.printerId = null;
    data.archivedAt = now;
    data.archivedReason = note ?? "cancelled";
  }

  const job = await prisma.job.update({ where: { id }, data });

  await prisma.activityLog.create({
    data: {
      clientId: job.clientId,
      jobId: job.id,
      invoiceId: job.invoiceId,
      action: "JOB_STATUS",
      message: `Job ${job.title} -> ${status.toLowerCase()}`,
      metadata: note ? { note } : undefined,
    },
  });

  logger.info({ scope: "jobs.status", data: { id, status } });
  return job;
}

export async function reorderJobs(entries: { id: number; queuePosition: number; printerId: number | null }[]) {
  // Validate assignments
  for (const entry of entries) {
    await ensurePrinterAssignable(entry.printerId ?? null);
  }
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.job.update({
        where: { id: entry.id },
        data: {
          queuePosition: entry.queuePosition,
          printerId: entry.printerId,
        },
      }),
    ),
  );
  logger.info({ scope: "jobs.reorder", data: { count: entries.length } });
}

export async function getJobCreationPolicy(): Promise<JobCreationPolicy> {
  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { jobCreationPolicy: true },
  });
  return settings?.jobCreationPolicy ?? JobCreationPolicy.ON_PAYMENT;
}

export async function archiveJob(id: number, reason?: string) {
  const job = await prisma.job.update({
    where: { id },
    data: { archivedAt: new Date(), archivedReason: reason ?? null },
  });
  await prisma.activityLog.create({
    data: {
      clientId: job.clientId,
      jobId: job.id,
      invoiceId: job.invoiceId,
      action: "JOB_ARCHIVED",
      message: `Job ${job.title} archived`,
      metadata: reason ? { reason } : undefined,
    },
  });
  return job;
}

export async function bulkArchiveJobs(ids: number[], reason?: string) {
  if (ids.length === 0) return 0;
  const now = new Date();
  await prisma.job.updateMany({
    where: { id: { in: ids } },
    data: { archivedAt: now, archivedReason: reason ?? null },
  });
  logger.info({ scope: "jobs.archive.bulk", data: { count: ids.length } });
  return ids.length;
}
