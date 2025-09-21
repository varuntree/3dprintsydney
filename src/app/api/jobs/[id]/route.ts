import { ok, fail, handleError } from "@/server/api/respond";
import { updateJob } from "@/server/services/jobs";
import { jobUpdateSchema } from "@/lib/schemas/jobs";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid job id");
  }
  return id;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const parsed = jobUpdateSchema.parse(payload);
    const job = await updateJob(id, parsed);
    return ok(job);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid job id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "jobs.update");
  }
}
