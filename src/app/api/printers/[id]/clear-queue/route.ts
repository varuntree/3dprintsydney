import { ok, fail, handleError } from "@/server/api/respond";
import { prisma } from "@/server/db/client";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid printer id");
  return id;
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = await parseId(context.params);
    await prisma.$transaction(async (tx) => {
      const jobs = await tx.job.findMany({
        where: { printerId: id, status: { in: ["QUEUED", "PAUSED"] } },
        orderBy: { queuePosition: "asc" },
        select: { id: true },
      });

      if (jobs.length === 0) {
        return;
      }

      const aggregate = await tx.job.aggregate({
        where: { printerId: null },
        _max: { queuePosition: true },
      });
      let nextPosition = (aggregate._max.queuePosition ?? -1) + 1;

      for (const job of jobs) {
        await tx.job.update({
          where: { id: job.id },
          data: { printerId: null, queuePosition: nextPosition++ },
        });
      }
    });
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid printer id")) {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "printers.clear_queue");
  }
}

