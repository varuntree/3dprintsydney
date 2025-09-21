import { Parser } from "json2csv";
import { prisma } from "@/server/db/client";
import { endOfDay, parseISO, startOfDay } from "date-fns";

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type DateRange = { from?: string | null; to?: string | null };

type CsvPayload = {
  filename: string;
  csv: string;
  contentType: string;
};

export async function exportInvoicesCsv(range?: DateRange): Promise<CsvPayload> {
  const { from, to } = normalizeRange(range);
  const invoices = await prisma.invoice.findMany({
    where: {
      issueDate: {
        gte: from ?? undefined,
        lte: to ?? undefined,
      },
    },
    include: {
      client: { select: { name: true } },
    },
    orderBy: [{ issueDate: "desc" }],
  });

  const rows = invoices.map((invoice) => ({
    invoice_number: invoice.number,
    client: invoice.client.name,
    status: invoice.status,
    issue_date: invoice.issueDate.toISOString(),
    due_date: invoice.dueDate ? invoice.dueDate.toISOString() : "",
    subtotal: decimalToNumber(invoice.subtotal),
    tax_total: decimalToNumber(invoice.taxTotal),
    total: decimalToNumber(invoice.total),
    balance_due: decimalToNumber(invoice.balanceDue),
    paid_at: invoice.paidAt ? invoice.paidAt.toISOString() : "",
  }));

  return buildCsvPayload("invoices", rows);
}

export async function exportPaymentsCsv(range?: DateRange): Promise<CsvPayload> {
  const { from, to } = normalizeRange(range);
  const payments = await prisma.payment.findMany({
    where: {
      paidAt: {
        gte: from ?? undefined,
        lte: to ?? undefined,
      },
    },
    include: {
      invoice: { select: { number: true, client: { select: { name: true } } } },
    },
    orderBy: [{ paidAt: "desc" }],
  });

  const rows = payments.map((payment) => ({
    invoice_number: payment.invoice.number,
    client: payment.invoice.client.name,
    amount: decimalToNumber(payment.amount),
    method: payment.method,
    reference: payment.reference ?? "",
    processor: payment.processor ?? "",
    processor_id: payment.processorId ?? "",
    paid_at: payment.paidAt.toISOString(),
    notes: payment.notes ?? "",
  }));

  return buildCsvPayload("payments", rows);
}

export async function exportJobsCsv(range?: DateRange): Promise<CsvPayload> {
  const { from, to } = normalizeRange(range);
  const jobs = await prisma.job.findMany({
    where: {
      createdAt: {
        gte: from ?? undefined,
        lte: to ?? undefined,
      },
    },
    include: {
      invoice: { select: { number: true } },
      client: { select: { name: true } },
      printer: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const rows = jobs.map((job) => ({
    job_id: job.id,
    title: job.title,
    invoice_number: job.invoice.number,
    client: job.client.name,
    printer: job.printer?.name ?? "Unassigned",
    status: job.status,
    priority: job.priority,
    created_at: job.createdAt.toISOString(),
    started_at: job.startedAt ? job.startedAt.toISOString() : "",
    completed_at: job.completedAt ? job.completedAt.toISOString() : "",
    estimated_hours: job.estimatedHours ?? "",
    actual_hours: job.actualHours ?? "",
  }));

  return buildCsvPayload("jobs", rows);
}

export async function exportArAgingCsv(range?: DateRange): Promise<CsvPayload> {
  const { from, to } = normalizeRange(range);
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      issueDate: { gte: from ?? undefined, lte: to ?? undefined },
    },
    include: { client: { select: { name: true } } },
  });
  const now = new Date();
  function bucket(due: Date | null) {
    if (!due) return "CURRENT";
    const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
    if (days <= 0) return "CURRENT";
    if (days <= 30) return "1-30";
    if (days <= 60) return "31-60";
    if (days <= 90) return "61-90";
    return "90+";
  }
  const rows = invoices.map((inv) => ({
    invoice_number: inv.number,
    client: inv.client.name,
    due_date: inv.dueDate ? inv.dueDate.toISOString() : "",
    balance_due: decimalToNumber(inv.balanceDue),
    bucket: bucket(inv.dueDate ?? null),
  }));
  return buildCsvPayload("ar-aging", rows);
}

export async function exportMaterialUsageCsv(range?: DateRange): Promise<CsvPayload> {
  const { from, to } = normalizeRange(range);
  const items = await prisma.invoiceItem.findMany({
    where: { invoice: { issueDate: { gte: from ?? undefined, lte: to ?? undefined } } },
    include: { productTemplate: { include: { material: true } }, invoice: { select: { number: true } } },
  });
  const agg = new Map<string, { count: number; amount: number }>();
  items.forEach((it) => {
    const name = it.productTemplate?.material?.name ?? "Unspecified";
    const key = name;
    const entry = agg.get(key) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += decimalToNumber(it.total);
    agg.set(key, entry);
  });
  const rows = Array.from(agg.entries()).map(([material, v]) => ({ material, items: v.count, amount: v.amount }));
  return buildCsvPayload("material-usage", rows);
}

export async function exportPrinterUtilizationCsv(range?: DateRange): Promise<CsvPayload> {
  const { from, to } = normalizeRange(range);
  const jobs = await prisma.job.findMany({
    where: { completedAt: { gte: from ?? undefined, lte: to ?? undefined } },
    include: { printer: { select: { name: true } } },
  });
  const agg = new Map<string, { jobs: number; hours: number }>();
  jobs.forEach((job) => {
    const name = job.printer?.name ?? "Unassigned";
    const entry = agg.get(name) ?? { jobs: 0, hours: 0 };
    entry.jobs += 1;
    entry.hours += job.actualHours ?? 0;
    agg.set(name, entry);
  });
  const rows = Array.from(agg.entries()).map(([printer, v]) => ({ printer, completed_jobs: v.jobs, hours: Number(v.hours.toFixed(2)) }));
  return buildCsvPayload("printer-utilization", rows);
}

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
  return {
    filename: `${type}-${timestamp}.csv`,
    csv,
    contentType: "text/csv;charset=utf-8",
  };
}
