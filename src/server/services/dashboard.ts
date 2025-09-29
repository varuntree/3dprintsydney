import { InvoiceStatus, JobStatus, QuoteStatus } from "@prisma/client";
import { format, startOfMonth, subDays, subMonths } from "date-fns";
import { prisma } from "@/server/db/client";

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

export async function getRecentActivity(options?: { limit?: number; offset?: number }): Promise<RecentActivityResult> {
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 50);
  const offset = Math.max(options?.offset ?? 0, 0);

  const activities = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      invoice: { select: { number: true } },
      quote: { select: { number: true } },
      job: { select: { title: true } },
      client: { select: { name: true } },
    },
  });

  const items = activities.map((entry) => ({
    id: entry.id,
    action: entry.action,
    message: entry.message,
    createdAt: entry.createdAt.toISOString(),
    context: buildActivityContext(entry),
  }));

  const nextOffset = activities.length < limit ? null : offset + activities.length;

  return { items, nextOffset };
}

export async function getDashboardSnapshot(options?: { range?: string; from?: string; to?: string; activityLimit?: number; activityOffset?: number }): Promise<DashboardSnapshot> {
  const now = new Date();
  let rangeStart30 = subDays(now, 30);
  let rangeStart60 = subDays(now, 60);
  let trendStart = startOfMonth(subMonths(now, 5));
  if (options?.range === "today") {
    rangeStart30 = subDays(now, 1);
    rangeStart60 = subDays(now, 2);
    trendStart = startOfMonth(subMonths(now, 1));
  }
  if (options?.range === "7d") {
    rangeStart30 = subDays(now, 7);
    rangeStart60 = subDays(now, 14);
    trendStart = startOfMonth(subMonths(now, 2));
  }
  if (options?.range === "ytd") {
    rangeStart30 = subDays(now, 30);
    rangeStart60 = subDays(now, 60);
    trendStart = startOfMonth(subMonths(now, 11));
  }

  const [paymentsLast60, outstandingInvoices, outstandingBalanceAgg, quoteGroups, jobGroups, printers, activityResult] =
    await Promise.all([
      prisma.payment.findMany({
        where: { paidAt: { gte: rangeStart60 } },
        select: { amount: true, paidAt: true },
      }),
      prisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
        },
        include: {
          client: { select: { name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
        take: 8,
      }),
      prisma.invoice.aggregate({
        where: {
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
        },
        _sum: { balanceDue: true },
      }),
      prisma.quote.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.job.groupBy({
        by: ["printerId", "status"],
        _count: { _all: true },
      }),
      prisma.printer.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      getRecentActivity({
        limit: options?.activityLimit,
        offset: options?.activityOffset,
      }),
    ]);

  const revenueTrendBaseStart = trendStart;
  const paymentsTrend = await prisma.payment.findMany({
    where: { paidAt: { gte: revenueTrendBaseStart } },
    select: { amount: true, paidAt: true },
  });

  const revenueTrend = buildRevenueTrend(paymentsTrend, now);

  const revenue30 = paymentsLast60
    .filter((payment) => payment.paidAt && payment.paidAt >= rangeStart30)
    .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);

  const revenue30Prev = paymentsLast60
    .filter(
      (payment) =>
        payment.paidAt &&
        payment.paidAt >= rangeStart60 &&
        payment.paidAt < rangeStart30,
    )
    .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);

  const outstandingBalance = decimalToNumber(
    outstandingBalanceAgg._sum.balanceDue ?? 0,
  );

  const pendingQuotes = quoteGroups.find((group) => group.status === QuoteStatus.PENDING)?._count._all ?? 0;

  const jobCounts = jobGroups.reduce(
    (acc, group) => {
      if (group.status === JobStatus.QUEUED) acc.queued += group._count._all;
      if (group.status === JobStatus.PRINTING) acc.printing += group._count._all;
      return acc;
    },
    { queued: 0, printing: 0 },
  );

  const jobSummary = buildJobSummary(jobGroups, printers);

  const outstanding = outstandingInvoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.client.name,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    balanceDue: decimalToNumber(invoice.balanceDue),
  }));

  const { items: recentActivity, nextOffset: recentActivityNextOffset } = activityResult;

  const quoteStatus = Object.values(QuoteStatus).map((status) => ({
    status,
    count: quoteGroups.find((group) => group.status === status)?._count._all ?? 0,
  }));

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
    outstandingInvoices: outstanding,
    recentActivity,
    recentActivityNextOffset,
  };
}

function buildRevenueTrend(
  payments: { amount: unknown; paidAt: Date | null }[],
  now: Date,
): { month: string; value: number }[] {
  const months: { [key: string]: number } = {};
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

  return Object.entries(months).map(([key, value]) => ({
    month: key,
    value,
  }));
}

function buildJobSummary(
  jobGroups: { printerId: number | null; status: JobStatus; _count: { _all: number } }[],
  printers: { id: number; name: string }[],
): DashboardSnapshot["jobSummary"] {
  const printerLookup = new Map(printers.map((printer) => [printer.id, printer.name]));
  const summaryMap = new Map<
    number | null,
    { printerId: number | null; printerName: string; queued: number; active: number }
  >();

  const ensure = (printerId: number | null) => {
    if (!summaryMap.has(printerId)) {
      summaryMap.set(printerId, {
        printerId,
        printerName: printerId === null ? "Unassigned" : printerLookup.get(printerId) ?? "Printer",
        queued: 0,
        active: 0,
      });
    }
    return summaryMap.get(printerId)!;
  };

  jobGroups.forEach((group) => {
    const entry = ensure(group.printerId);
    if (group.status === JobStatus.QUEUED) {
      entry.queued += group._count._all;
    }
    if (group.status === JobStatus.PRINTING) {
      entry.active += group._count._all;
    }
  });

  printers.forEach((printer) => {
    ensure(printer.id);
  });

  ensure(null);

  return Array.from(summaryMap.values()).sort((a, b) => {
    if (a.printerId === null) return -1;
    if (b.printerId === null) return 1;
    return a.printerName.localeCompare(b.printerName);
  });
}

function buildActivityContext(activity: {
  invoice: { number: string } | null;
  quote: { number: string } | null;
  job: { title: string } | null;
  client: { name: string } | null;
}): string {
  if (activity.invoice) return `Invoice ${activity.invoice.number}`;
  if (activity.quote) return `Quote ${activity.quote.number}`;
  if (activity.job) return activity.job.title;
  if (activity.client) return activity.client.name;
  return "";
}
