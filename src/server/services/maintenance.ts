import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/server/db/client";
import { InvoiceStatus, QuoteStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

async function getSettings() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return {
    overdueDays: s?.overdueDays ?? 0,
    reminderCadenceDays: s?.reminderCadenceDays ?? 7,
    autoArchiveCompletedJobsAfterDays: s?.autoArchiveCompletedJobsAfterDays ?? 7,
  };
}

export async function runDailyMaintenance(now: Date = new Date()) {
  const settings = await getSettings();
  const tasks: Array<Promise<unknown>> = [];

  // Overdue invoices
  if (settings.overdueDays >= 0) {
    const cutoff = addDays(startOfDay(now), -settings.overdueDays);
    tasks.push(
      prisma.invoice.updateMany({
        where: { status: { in: [InvoiceStatus.PENDING] }, dueDate: { lte: cutoff } },
        data: { status: InvoiceStatus.OVERDUE },
      }),
    );
  }

  // Expire quotes (treat expiryDate/expiresAt equivalently)
  tasks.push(
    prisma.quote.updateMany({
      where: {
        status: QuoteStatus.PENDING,
        OR: [
          { expiryDate: { lte: now } },
          { expiresAt: { lte: now } },
        ],
      },
      data: { status: QuoteStatus.DECLINED },
    }),
  );

  // Auto-archive completed jobs older than N days
  if (settings.autoArchiveCompletedJobsAfterDays > 0) {
    const cutoff = addDays(startOfDay(now), -settings.autoArchiveCompletedJobsAfterDays);
    tasks.push(
      prisma.job.updateMany({
        where: { completedAt: { lte: cutoff }, archivedAt: null },
        data: { archivedAt: now, archivedReason: "auto-archive" },
      }),
    );
  }

  await Promise.all(tasks);
  logger.info({ scope: "maintenance.run", data: { tasks: tasks.length } });
}

