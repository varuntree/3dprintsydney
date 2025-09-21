import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { listInvoices, createInvoice } from "@/server/services/invoices";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const status = searchParams.getAll("status");
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "issueDate" | "dueDate" | "createdAt" | "number" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const invoices = await listInvoices({
      q,
      statuses: status.length ? (status as ("PENDING"|"PAID"|"OVERDUE")[]) : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return ok(invoices);
  } catch (error) {
    return handleError(error, "invoices.list");
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const invoice = await createInvoice(payload);
    return ok(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid invoice payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "invoices.create");
  }
}
