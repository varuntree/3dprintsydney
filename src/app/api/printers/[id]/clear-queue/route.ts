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
      await tx.job.updateMany({ where: { printerId: id, status: { in: ["QUEUED", "PAUSED"] } }, data: { printerId: null } });
    });
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid printer id")) {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "printers.clear_queue");
  }
}

