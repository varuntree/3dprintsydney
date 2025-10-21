import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import {
  getInvoiceDetail,
  updateInvoice,
  deleteInvoice,
} from "@/server/services/invoices";
import { invoiceInputSchema } from "@/lib/schemas/invoices";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    // auth: admin or owning client only
    await requireInvoiceAccess(request, id);
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireInvoiceAccess(request, id);
    const body = await request.json();
    const validated = invoiceInputSchema.parse(body);
    const invoice = await updateInvoice(id, validated);
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireInvoiceAccess(request, id);
    const invoice = await deleteInvoice(id);
    return ok(invoice);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.delete");
  }
}
