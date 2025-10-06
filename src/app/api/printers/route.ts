import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { listPrinters, createPrinter } from "@/server/services/printers";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

/**
 * GET /api/printers
 * ADMIN ONLY - Printer management is admin-only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "name" | "updatedAt" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const printers = await listPrinters({
      q,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return ok(printers);
  } catch (error) {
    return handleError(error, "printers.list");
  }
}

/**
 * POST /api/printers
 * ADMIN ONLY - Only admins can create printers
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const payload = await request.json();
    const printer = await createPrinter(payload);
    return ok(printer, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid printer payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "printers.create");
  }
}
