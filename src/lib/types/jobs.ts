/**
 * Job Types
 * All types related to the jobs resource
 */

import type { JobStatus, JobPriority, InvoiceStatus, PrinterStatus } from '@/lib/constants/enums';

// Re-export Input types from schemas (Zod-validated)
export type { JobUpdateInput, JobStatusInput } from '@/lib/schemas/jobs';

/**
 * Job Card DTO
 * Represents a job card with all display information
 */
export type JobCardDTO = {
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

/**
 * Job Board Column DTO
 * Represents a column in the job board (one per printer + unassigned)
 */
export type JobBoardColumnDTO = {
  key: string;
  printerId: number | null;
  printerName: string;
  printerStatus: PrinterStatus | "UNASSIGNED";
  jobs: JobCardDTO[];
  metrics: {
    queuedCount: number;
    activeCount: number;
    totalEstimatedHours: number;
  };
};

/**
 * Job Board Snapshot DTO
 * Complete snapshot of the job board state
 */
export type JobBoardSnapshotDTO = {
  columns: JobBoardColumnDTO[];
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

/**
 * Job Filters
 * Query parameters for job operations
 */
export type JobFilters = {
  includeArchived?: boolean;
  completedSince?: Date | null;
  statuses?: JobStatus[] | null;
};
