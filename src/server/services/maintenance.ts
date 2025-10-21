import { addDays, startOfDay } from "date-fns";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { InvoiceStatus, QuoteStatus } from "@/lib/constants/enums";
import { AppError } from "@/lib/errors";

async function getSettings() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("settings")
    .select("overdue_days, reminder_cadence_days, auto_archive_completed_jobs_after_days")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    throw new AppError(`Failed to load maintenance settings: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return {
    overdueDays: data?.overdue_days ?? 0,
    reminderCadenceDays: data?.reminder_cadence_days ?? 7,
    autoArchiveCompletedJobsAfterDays: data?.auto_archive_completed_jobs_after_days ?? 7,
  };
}

/**
 * Run daily maintenance tasks: mark overdue invoices, expire quotes, archive old jobs
 * @param now - Current date/time (defaults to current time)
 * @throws AppError if any maintenance task fails
 */
export async function runDailyMaintenance(now: Date = new Date()) {
  const settings = await getSettings();
  const supabase = getServiceSupabase();
  let actions = 0;

  if (settings.overdueDays >= 0) {
    const cutoff = addDays(startOfDay(now), -settings.overdueDays).toISOString();
    const { error } = await supabase
      .from("invoices")
      .update({ status: InvoiceStatus.OVERDUE })
      .eq("status", InvoiceStatus.PENDING)
      .lte("due_date", cutoff);
    if (error) {
      throw new AppError(`Failed to mark overdue invoices: ${error.message}`, 'DATABASE_ERROR', 500);
    }
    actions += 1;
  }

  {
    const { error } = await supabase
      .from("quotes")
      .update({ status: QuoteStatus.DECLINED })
      .eq("status", QuoteStatus.PENDING)
      .or(`expiry_date.lte.${now.toISOString()},expires_at.lte.${now.toISOString()}`);
    if (error) {
      throw new AppError(`Failed to expire quotes: ${error.message}`, 'DATABASE_ERROR', 500);
    }
    actions += 1;
  }

  if (settings.autoArchiveCompletedJobsAfterDays > 0) {
    const cutoff = addDays(startOfDay(now), -settings.autoArchiveCompletedJobsAfterDays).toISOString();
    const { error } = await supabase
      .from("jobs")
      .update({ archived_at: now.toISOString(), archived_reason: "auto-archive" })
      .lte("completed_at", cutoff)
      .is("archived_at", null);
    if (error) {
      throw new AppError(`Failed to archive completed jobs: ${error.message}`, 'DATABASE_ERROR', 500);
    }
    actions += 1;
  }

  logger.info({ scope: "maintenance.run", data: { tasks: actions } });
}
