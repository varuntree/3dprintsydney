import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import {
  getInvoiceDetail,
  updateInvoice,
  deleteInvoice,
} from "@/server/services/invoices";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const invoice = await getInvoiceDetail(id);
    return ok(invoice);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.detail");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const invoice = await updateInvoice(id, payload);
    return ok(invoice);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid invoice payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.update");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const invoice = await deleteInvoice(id);
    return ok(invoice);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.delete");
  }
}
