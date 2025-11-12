import { format, startOfMonth, subDays, subMonths } from "date-fns";
import { InvoiceStatus, JobStatus, QuoteStatus } from "@/lib/constants/enums";
import { ClientProjectCounters } from "@/lib/types/dashboard";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type ActivityRow = {
  id: number;
  action: string;
  message: string;
  created_at: string;
  invoices?: { number: string | null }[] | null;
  quotes?: { number: string | null }[] | null;
  jobs?: { title: string | null }[] | null;
  clients?: { name: string | null }[] | null;
};

export type RecentActivityEntry = {
  id: number;
  action: string;
  message: string;
  createdAt: string;
  context: string;
};

export type RecentActivityResult = {
  items: RecentActivityEntry[];
  nextOffset: number | null;
};

export type DashboardSnapshot = {
  metrics: {
    revenue30: number;
    revenue30Prev: number;
    outstandingBalance: number;
    pendingQuotes: number;
    jobsQueued: number;
    jobsPrinting: number;
  };
  revenueTrend: { month: string; value: number }[];
  quoteStatus: { status: QuoteStatus; count: number }[];
  jobSummary: {
    printerId: number | null;
    printerName: string;
    queued: number;
    active: number;
  }[];
  outstandingInvoices: {
    id: number;
    number: string;
    clientName: string;
    dueDate: string | null;
    balanceDue: number;
  }[];
  recentActivity: RecentActivityEntry[];
  recentActivityNextOffset: number | null;
};

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getClientProjectCounters(clientId: number, walletBalance: number): Promise<ClientProjectCounters> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("jobs")
    .select("status, invoice:invoices(status, balance_due)")
    .eq("client_id", clientId)
    .is("archived_at", null);

  if (error) {
    throw new AppError(
      `Failed to load client projects for counters: ${error.message}`,
      'DASHBOARD_ERROR',
      500,
    );
  }

  let pendingPrint = 0;
  let pendingPayment = 0;
  let completed = 0;

  (data ?? []).forEach((row) => {
    const invoiceStatus = (row.invoice?.status ?? "").toUpperCase();
    const balanceDue = decimalToNumber((row.invoice as { balance_due?: unknown })?.balance_due);
    const needsPayment =
      invoiceStatus !== InvoiceStatus.PAID || (balanceDue > 0);
    if (needsPayment) {
      pendingPayment += 1;
      return;
    }

    if ((row.status ?? JobStatus.QUEUED) === JobStatus.COMPLETED) {
      completed += 1;
      return;
    }

    pendingPrint += 1;
  });

  return {
    pendingPrint,
    pendingPayment,
    completed,
    availableCredit: walletBalance,
  };
}

function buildActivityContext(activity: ActivityRow): string {
  const invoice = activity.invoices?.[0]?.number;
  const quote = activity.quotes?.[0]?.number;
  const job = activity.jobs?.[0]?.title;
  const client = activity.clients?.[0]?.name;
  if (invoice) return `Invoice ${invoice}`;
  if (quote) return `Quote ${quote}`;
  if (job) return job;
  if (client) return client;
  return "";
}

/**
 * Get recent activity log entries with pagination
 * @param options - Pagination options (limit and offset)
 * @returns Recent activity items with next offset for pagination
 * @throws AppError if database query fails
 */
export async function getRecentActivity(options?: {
  limit?: number;
  offset?: number;
}): Promise<RecentActivityResult> {
  logger.info({
    scope: "dashboard.activity",
    message: "Fetching recent activity entries",
    data: { limit: options?.limit, offset: options?.offset },
  });
  const supabase = getServiceSupabase();
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 50);
  const offset = Math.max(options?.offset ?? 0, 0);
  const start = offset;
  const end = offset + limit - 1;

  const { data, error } = await supabase
    .from("activity_logs")
    .select(
      "id, action, message, created_at, invoices:invoices(number), quotes:quotes(number), jobs:jobs(title), clients:clients(name)",
    )
    .order("created_at", { ascending: false })
    .range(start, end);

  if (error) {
    throw new AppError(`Failed to load activity: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const rows = (data ?? []) as ActivityRow[];
  const items: RecentActivityEntry[] = rows.map((row) => ({
    id: row.id,
    action: row.action,
    message: row.message,
    createdAt: new Date(row.created_at).toISOString(),
    context: buildActivityContext(row),
  }));

  const nextOffset = rows.length < limit ? null : offset + rows.length;
  return { items, nextOffset };
}

type PaymentRow = { amount: unknown; paid_at: string | null };
type InvoiceListRow = {
  id: number;
  number: string;
  due_date: string | null;
  balance_due: unknown;
  clients?: { name: string | null }[] | null;
};
type QuoteRow = { status: string | null };
type JobGroupRow = { printer_id: number | null; status: string | null };
type PrinterRow = { id: number; name: string; status?: string | null };

/**
 * Get comprehensive dashboard snapshot with metrics, trends, and activity
 * @param options - Date range, activity pagination, and filter options
 * @returns Complete dashboard data including revenue, jobs, quotes, and activity
 * @throws AppError if any database query fails
 */
export async function getDashboardSnapshot(options?: {
  range?: string;
  from?: string;
  to?: string;
  activityLimit?: number;
  activityOffset?: number;
}): Promise<DashboardSnapshot> {
  logger.info({
    scope: "dashboard.snapshot",
    message: "Generating dashboard snapshot",
    data: { range: options?.range, activityLimit: options?.activityLimit },
  });
  const now = new Date();
  let rangeStart30 = subDays(now, 30);
  let rangeStart60 = subDays(now, 60);
  let trendStart = startOfMonth(subMonths(now, 5));

  switch (options?.range) {
    case "today":
      rangeStart30 = subDays(now, 1);
      rangeStart60 = subDays(now, 2);
      trendStart = startOfMonth(subMonths(now, 1));
      break;
    case "7d":
      rangeStart30 = subDays(now, 7);
      rangeStart60 = subDays(now, 14);
      trendStart = startOfMonth(subMonths(now, 2));
      break;
    case "ytd":
      rangeStart30 = subDays(now, 30);
      rangeStart60 = subDays(now, 60);
      trendStart = startOfMonth(subMonths(now, 11));
      break;
    default:
      break;
  }

  const supabase = getServiceSupabase();

  const [
    paymentsLast60Res,
    outstandingInvoicesRes,
    quotesRes,
    jobsRes,
    printersRes,
    activityRes,
    paymentsTrendRes,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at")
      .gte("paid_at", rangeStart60.toISOString()),
    supabase
      .from("invoices")
      .select("id, number, due_date, balance_due, clients(name)")
      .in("status", [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE])
      .order("due_date", { ascending: true })
      .order("issue_date", { ascending: true })
      .limit(8),
    supabase.from("quotes").select("status"),
    supabase.from("jobs").select("printer_id, status"),
    supabase.from("printers").select("id, name, status").order("name", { ascending: true }),
    getRecentActivity({
      limit: options?.activityLimit,
      offset: options?.activityOffset,
    }),
    supabase
      .from("payments")
      .select("amount, paid_at")
      .gte("paid_at", trendStart.toISOString()),
  ]);

  if (paymentsLast60Res.error) {
    throw new AppError(`Failed to load payments: ${paymentsLast60Res.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (outstandingInvoicesRes.error) {
    throw new AppError(
      `Failed to load outstanding invoices: ${outstandingInvoicesRes.error.message}`,
      'DATABASE_ERROR',
      500,
    );
  }
  if (quotesRes.error) {
    throw new AppError(`Failed to load quote stats: ${quotesRes.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (jobsRes.error) {
    throw new AppError(`Failed to load job summary: ${jobsRes.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (printersRes.error) {
    throw new AppError(`Failed to load printers: ${printersRes.error.message}`, 'DATABASE_ERROR', 500);
  }
  if (paymentsTrendRes.error) {
    throw new AppError(`Failed to load revenue trend: ${paymentsTrendRes.error.message}`, 'DATABASE_ERROR', 500);
  }

  const paymentsLast60 = (paymentsLast60Res.data ?? []) as PaymentRow[];
  const outstandingInvoicesRows = (outstandingInvoicesRes.data ?? []) as InvoiceListRow[];
  const quotes = (quotesRes.data ?? []) as QuoteRow[];
  const jobs = (jobsRes.data ?? []) as JobGroupRow[];
  const printers = (printersRes.data ?? []) as PrinterRow[];
  const paymentsTrendRows = (paymentsTrendRes.data ?? []) as PaymentRow[];

  const revenue30 = paymentsLast60
    .filter((payment) => payment.paid_at && new Date(payment.paid_at) >= rangeStart30)
    .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);

  const revenue30Prev = paymentsLast60
    .filter((payment) => {
      if (!payment.paid_at) return false;
      const paidAt = new Date(payment.paid_at);
      return paidAt >= rangeStart60 && paidAt < rangeStart30;
    })
    .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);

  const outstandingBalance = outstandingInvoicesRows.reduce(
    (acc, invoice) => acc + decimalToNumber(invoice.balance_due),
    0,
  );

  const pendingQuotes = quotes.filter(
    (quote) => quote.status === QuoteStatus.PENDING,
  ).length;

  const jobCounts = jobs.reduce(
    (acc, row) => {
      const status = (row.status ?? JobStatus.QUEUED) as JobStatus;
      if (status === JobStatus.QUEUED) acc.queued += 1;
      if (status === JobStatus.PRINTING) acc.printing += 1;
      return acc;
    },
    { queued: 0, printing: 0 },
  );

  const outstandingInvoices = outstandingInvoicesRows.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.clients?.[0]?.name ?? "",
    dueDate: invoice.due_date ? new Date(invoice.due_date).toISOString() : null,
    balanceDue: decimalToNumber(invoice.balance_due),
  }));

  const quoteStatusCounts = new Map<QuoteStatus, number>();
  Object.values(QuoteStatus).forEach((status) => quoteStatusCounts.set(status, 0));
  quotes.forEach((row) => {
    const status = (row.status ?? QuoteStatus.DRAFT) as QuoteStatus;
    quoteStatusCounts.set(status, (quoteStatusCounts.get(status) ?? 0) + 1);
  });

  const jobSummaryMap = new Map<
    number | null,
    { printerId: number | null; printerName: string; queued: number; active: number }
  >();

  const ensureSummary = (printerId: number | null) => {
    if (!jobSummaryMap.has(printerId)) {
      const printerName =
        printerId === null
          ? "Unassigned"
          : printers.find((printer) => printer.id === printerId)?.name ?? "Printer";
      jobSummaryMap.set(printerId, {
        printerId,
        printerName,
        queued: 0,
        active: 0,
      });
    }
    return jobSummaryMap.get(printerId)!;
  };

  jobs.forEach((row) => {
    const printerId = row.printer_id;
    const status = (row.status ?? JobStatus.QUEUED) as JobStatus;
    const summary = ensureSummary(printerId);
    if (status === JobStatus.QUEUED) summary.queued += 1;
    if (status === JobStatus.PRINTING) summary.active += 1;
  });

  printers.forEach((printer) => ensureSummary(printer.id));
  ensureSummary(null);

  const jobSummary = Array.from(jobSummaryMap.values()).sort((a, b) => {
    if (a.printerId === null) return -1;
    if (b.printerId === null) return 1;
    return a.printerName.localeCompare(b.printerName);
  });

  const revenueTrend = buildRevenueTrend(
    paymentsTrendRows.map((row) => ({
      amount: row.amount,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
    })),
    now,
  );

  const quoteStatus = Array.from(quoteStatusCounts.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const { items: recentActivity, nextOffset: recentActivityNextOffset } = activityRes;

  return {
    metrics: {
      revenue30,
      revenue30Prev,
      outstandingBalance,
      pendingQuotes,
      jobsQueued: jobCounts.queued,
      jobsPrinting: jobCounts.printing,
    },
    revenueTrend,
    quoteStatus,
    jobSummary,
    outstandingInvoices,
    recentActivity,
    recentActivityNextOffset,
  };
}

function buildRevenueTrend(
  payments: { amount: unknown; paidAt: Date | null }[],
  now: Date,
): { month: string; value: number }[] {
  const months: Record<string, number> = {};
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = startOfMonth(subMonths(now, i));
    const key = format(monthDate, "yyyy-MM");
    months[key] = 0;
  }

  payments.forEach((payment) => {
    if (!payment.paidAt) return;
    const key = format(startOfMonth(payment.paidAt), "yyyy-MM");
    if (!(key in months)) return;
    months[key] += decimalToNumber(payment.amount);
  });

  return Object.entries(months).map(([month, value]) => ({ month, value }));
}

/**
 * Get dashboard statistics for a specific client's projects
 * @param clientId - The client ID to get stats for
 * @returns Aggregated project metrics (totalOrders currently represents the project count)
 */
export async function getClientDashboardStats(
  clientId: number
): Promise<{
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  totalSpent: number;
  walletBalance: number;
}> {
  const supabase = getServiceSupabase();

  const [totalRes, pendingRes, paidRes, paidInvoicesRes, clientRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", InvoiceStatus.PENDING),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", InvoiceStatus.PAID),
    supabase
      .from("invoices")
      .select("total")
      .eq("client_id", clientId)
      .eq("status", InvoiceStatus.PAID),
    supabase
      .from("clients")
      .select("wallet_balance")
      .eq("id", clientId)
      .single(),
  ]);

  if (totalRes.error) {
    throw new AppError(
      `Failed to count invoices: ${totalRes.error.message}`,
      'DASHBOARD_ERROR',
      500
    );
  }
  if (pendingRes.error) {
    throw new AppError(
      `Failed to count pending invoices: ${pendingRes.error.message}`,
      'DASHBOARD_ERROR',
      500
    );
  }
  if (paidRes.error) {
    throw new AppError(
      `Failed to count paid invoices: ${paidRes.error.message}`,
      'DASHBOARD_ERROR',
      500
    );
  }
  if (paidInvoicesRes.error) {
    throw new AppError(
      `Failed to fetch paid invoices: ${paidInvoicesRes.error.message}`,
      'DASHBOARD_ERROR',
      500
    );
  }
  if (clientRes.error) {
    throw new AppError(
      `Failed to fetch client data: ${clientRes.error.message}`,
      'DASHBOARD_ERROR',
      500
    );
  }

  // TODO: Rename totalOrders to totalProjects when the API payload and clients are aligned.
  const totalOrders = totalRes.count ?? 0;
  const pendingCount = pendingRes.count ?? 0;
  const paidCount = paidRes.count ?? 0;
  const totalSpent = (paidInvoicesRes.data ?? []).reduce(
    (sum, row) => sum + decimalToNumber((row as { total: unknown }).total),
    0
  );
  const walletBalance = decimalToNumber(
    (clientRes.data as { wallet_balance: unknown } | null)?.wallet_balance
  );
  const projectCounters = await getClientProjectCounters(clientId, walletBalance);

  return {
    totalOrders,
    pendingCount,
    paidCount,
    totalSpent,
    walletBalance,
    projectCounters,
  };
}
