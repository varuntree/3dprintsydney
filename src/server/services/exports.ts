import { Parser } from "json2csv";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { InvoiceStatus, JobStatus, JobPriority } from "@/lib/constants/enums";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type DateRange = { from?: string | null; to?: string | null };

type CsvPayload = {
  filename: string;
  csv: string;
  contentType: string;
};

function normalizeRange(range?: DateRange) {
  if (!range) return { from: undefined, to: undefined };
  const from = range.from ? startOfDay(parseISO(range.from)) : undefined;
  const to = range.to ? endOfDay(parseISO(range.to)) : undefined;
  return { from, to };
}

function buildCsvPayload(type: string, rows: Record<string, unknown>[]): CsvPayload {
  const parser = new Parser();
  const csv = parser.parse(rows);
  const timestamp = new Date().toISOString().split("T")[0];
  logger.info({ scope: `exports.${type}`, data: { rows: rows.length, timestamp } });
  return {
    filename: `${type}-${timestamp}.csv`,
    csv,
    contentType: "text/csv;charset=utf-8",
  };
}

/**
 * Export invoices data to CSV format
 * @param range - Optional date range filter
 * @returns CSV payload with filename and content
 * @throws AppError if database query fails
 */
export async function exportInvoicesCsv(range?: DateRange): Promise<CsvPayload> {
  const supabase = getServiceSupabase();
  const { from, to } = normalizeRange(range);
  const scope = "exports.invoices";
  const logRange = {
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };

  let query = supabase
    .from("invoices")
    .select("number, status, issue_date, due_date, subtotal, tax_total, total, balance_due, paid_at, clients(name)")
    .order("issue_date", { ascending: false });

  if (from) query = query.gte("issue_date", from.toISOString());
  if (to) query = query.lte("issue_date", to.toISOString());

  const { data, error } = await query;
  if (error) {
    logger.error({
      scope,
      message: "Failed to export invoices CSV",
      error,
      data: { range: logRange },
    });
    throw new AppError(`Failed to export invoices: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const rows = (data ?? []).map((invoice) => {
    const client = unwrap(invoice.clients);
    return {
      invoice_number: invoice.number,
      client: client?.name ?? "",
      status: invoice.status,
      issue_date: invoice.issue_date ? new Date(invoice.issue_date).toISOString() : "",
      due_date: invoice.due_date ? new Date(invoice.due_date).toISOString() : "",
      subtotal: decimalToNumber(invoice.subtotal),
      tax_total: decimalToNumber(invoice.tax_total),
      total: decimalToNumber(invoice.total),
      balance_due: decimalToNumber(invoice.balance_due),
      paid_at: invoice.paid_at ? new Date(invoice.paid_at).toISOString() : "",
    };
  });

  return buildCsvPayload("invoices", rows);
}

/**
 * Export payments data to CSV format
 * @param range - Optional date range filter
 * @returns CSV payload with filename and content
 * @throws AppError if database query fails
 */
export async function exportPaymentsCsv(range?: DateRange): Promise<CsvPayload> {
  const supabase = getServiceSupabase();
  const { from, to } = normalizeRange(range);
  const scope = "exports.payments";
  const logRange = {
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };

  let query = supabase
    .from("payments")
    .select("amount, method, reference, processor, processor_id, paid_at, notes, invoices(number, clients(name))")
    .order("paid_at", { ascending: false });

  if (from) query = query.gte("paid_at", from.toISOString());
  if (to) query = query.lte("paid_at", to.toISOString());

  const { data, error } = await query;
  if (error) {
    logger.error({
      scope,
      message: "Failed to export payments CSV",
      error,
      data: { range: logRange },
    });
    throw new AppError(`Failed to export payments: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const rows = (data ?? []).map((payment) => {
    const invoice = unwrap(payment.invoices);
    const client = invoice ? unwrap(invoice.clients) : null;
    return {
      invoice_number: invoice?.number ?? "",
      client: client?.name ?? "",
      amount: decimalToNumber(payment.amount),
      method: payment.method,
      reference: payment.reference ?? "",
      processor: payment.processor ?? "",
      processor_id: payment.processor_id ?? "",
      paid_at: payment.paid_at ? new Date(payment.paid_at).toISOString() : "",
      notes: payment.notes ?? "",
    };
  });

  return buildCsvPayload("payments", rows);
}

/**
 * Export jobs data to CSV format
 * @param range - Optional date range filter
 * @returns CSV payload with filename and content
 * @throws AppError if database query fails
 */
export async function exportJobsCsv(range?: DateRange): Promise<CsvPayload> {
  const supabase = getServiceSupabase();
  const { from, to } = normalizeRange(range);
  const scope = "exports.jobs";
  const logRange = {
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };

  let query = supabase
    .from("jobs")
    .select("id, title, status, priority, created_at, started_at, completed_at, estimated_hours, actual_hours, invoices(number), clients(name), printers(name)")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from.toISOString());
  if (to) query = query.lte("created_at", to.toISOString());

  const { data, error } = await query;
  if (error) {
    logger.error({
      scope,
      message: "Failed to export jobs CSV",
      error,
      data: { range: logRange },
    });
    throw new AppError(`Failed to export jobs: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const rows = (data ?? []).map((job) => {
    const invoice = unwrap(job.invoices);
    const client = unwrap(job.clients);
    const printer = unwrap(job.printers);
    return {
      job_id: job.id,
      title: job.title,
      invoice_number: invoice?.number ?? "",
      client: client?.name ?? "",
      printer: printer?.name ?? "Unassigned",
      status: job.status as JobStatus,
      priority: job.priority as JobPriority,
      created_at: job.created_at ? new Date(job.created_at).toISOString() : "",
      started_at: job.started_at ? new Date(job.started_at).toISOString() : "",
      completed_at: job.completed_at ? new Date(job.completed_at).toISOString() : "",
      estimated_hours: job.estimated_hours ?? "",
      actual_hours: job.actual_hours ?? "",
    };
  });

  return buildCsvPayload("jobs", rows);
}

/**
 * Export accounts receivable aging report to CSV format
 * @param range - Optional date range filter
 * @returns CSV payload with filename and content
 * @throws AppError if database query fails
 */
export async function exportArAgingCsv(range?: DateRange): Promise<CsvPayload> {
  const supabase = getServiceSupabase();
  const { from, to } = normalizeRange(range);
  const scope = "exports.ar-aging";
  const logRange = {
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };

  let query = supabase
    .from("invoices")
    .select("number, due_date, balance_due, clients(name)")
    .in("status", [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]);

  if (from) query = query.gte("issue_date", from.toISOString());
  if (to) query = query.lte("issue_date", to.toISOString());

  const { data, error } = await query;
  if (error) {
    logger.error({
      scope,
      message: "Failed to export A/R aging CSV",
      error,
      data: { range: logRange },
    });
    throw new AppError(`Failed to export A/R aging: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const invoices = data ?? [];
  const now = new Date();
  const rows = invoices.map((invoice) => {
    const client = unwrap(invoice.clients);
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    let bucket = "CURRENT";
    if (dueDate) {
      const days = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
      if (days > 0 && days <= 30) bucket = "1-30";
      else if (days <= 60) bucket = "31-60";
      else if (days <= 90) bucket = "61-90";
      else if (days > 90) bucket = "90+";
    }
    return {
      invoice_number: invoice.number,
      client: client?.name ?? "",
      due_date: dueDate ? dueDate.toISOString() : "",
      balance_due: decimalToNumber(invoice.balance_due),
      bucket,
    };
  });

  return buildCsvPayload("ar-aging", rows);
}

/**
 * Export material usage statistics to CSV format
 * @param range - Optional date range filter
 * @returns CSV payload with filename and content
 * @throws AppError if database query fails
 */
export async function exportMaterialUsageCsv(range?: DateRange): Promise<CsvPayload> {
  const supabase = getServiceSupabase();
  const { from, to } = normalizeRange(range);
  const scope = "exports.material-usage";
  const logRange = {
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };

  let query = supabase
    .from("invoice_items")
    .select(
      "total, product_templates:product_templates(materials:materials(name)), invoice:invoices(issue_date)",
    );

  if (from) query = query.gte("invoice.issue_date", from.toISOString());
  if (to) query = query.lte("invoice.issue_date", to.toISOString());

  const { data, error } = await query;
  if (error) {
    logger.error({
      scope,
      message: "Failed to export material usage CSV",
      error,
      data: { range: logRange },
    });
    throw new AppError(`Failed to export material usage: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const agg = new Map<string, { count: number; amount: number }>();
  (data ?? []).forEach((item) => {
    const template = unwrap(item.product_templates);
    const material = template ? unwrap(template.materials) : null;
    const materialName = material?.name ?? "Unspecified";
    const entry = agg.get(materialName) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += decimalToNumber(item.total);
    agg.set(materialName, entry);
  });

  const rows = Array.from(agg.entries()).map(([material, stats]) => ({
    material,
    items: stats.count,
    amount: stats.amount,
  }));

  return buildCsvPayload("material-usage", rows);
}

/**
 * Export printer utilization statistics to CSV format
 * @param range - Optional date range filter
 * @returns CSV payload with filename and content
 * @throws AppError if database query fails
 */
export async function exportPrinterUtilizationCsv(range?: DateRange): Promise<CsvPayload> {
  const supabase = getServiceSupabase();
  const { from, to } = normalizeRange(range);
  const scope = "exports.printer-utilization";
  const logRange = {
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };

  let query = supabase
    .from("jobs")
    .select("actual_hours, printers(name)")
    .not("completed_at", "is", null);

  if (from) query = query.gte("completed_at", from.toISOString());
  if (to) query = query.lte("completed_at", to.toISOString());

  const { data, error } = await query;
  if (error) {
    logger.error({
      scope,
      message: "Failed to export printer utilization CSV",
      error,
      data: { range: logRange },
    });
    throw new AppError(`Failed to export printer utilization: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const agg = new Map<string, { jobs: number; hours: number }>();
  (data ?? []).forEach((job) => {
    const printer = unwrap(job.printers);
    const printerName = printer?.name ?? "Unassigned";
    const entry = agg.get(printerName) ?? { jobs: 0, hours: 0 };
    entry.jobs += 1;
    entry.hours += decimalToNumber(job.actual_hours);
    agg.set(printerName, entry);
  });

  const rows = Array.from(agg.entries()).map(([printer, stats]) => ({
    printer,
    completed_jobs: stats.jobs,
    hours: Number(stats.hours.toFixed(2)),
  }));

  return buildCsvPayload("printer-utilization", rows);
}
