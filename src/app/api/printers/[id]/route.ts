import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { updatePrinter, deletePrinter } from "@/server/services/printers";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid printer id");
  }
  return id;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const printer = await updatePrinter(id, payload);
    return ok(printer);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid printer payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid printer id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "printers.update");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const printer = await deletePrinter(id);
    return ok(printer);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid printer id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "printers.delete");
  }
}
