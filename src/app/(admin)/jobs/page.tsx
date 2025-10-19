import {
  JobsBoard,
  type JobBoardClientSnapshot,
} from "@/components/jobs/job-board";
import { getJobBoard } from "@/server/services/jobs";
import { JobStatus } from "@/lib/constants/enums";

export default async function JobsPage() {
  const board = await getJobBoard({
    includeArchived: false,
    statuses: [
      JobStatus.QUEUED,
      JobStatus.PRE_PROCESSING,
      JobStatus.IN_QUEUE,
      JobStatus.PRINTING,
      JobStatus.PAUSED,
    ],
  });

  const initial: JobBoardClientSnapshot = {
    columns: board.columns.map((column) => ({
      key: column.key,
      printerId: column.printerId,
      printerName: column.printerName,
      printerStatus: column.printerStatus,
      metrics: column.metrics,
      jobs: column.jobs.map((job) => ({
        ...job,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt ? job.startedAt.toISOString() : null,
        completedAt: job.completedAt ? job.completedAt.toISOString() : null,
      })),
    })),
    summary: board.summary,
  };

  return (
    <div className="space-y-6">
      <JobsBoard initial={initial} />
    </div>
  );
}
