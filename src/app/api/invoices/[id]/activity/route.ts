import { NextRequest } from "next/server";
import { requireAdminAPI } from "@/server/auth/api-helpers";
import { getInvoiceActivity } from "@/server/services/invoices";
import { ok, handleError } from "@/server/api/respond";
import { BadRequestError } from "@/lib/errors";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new BadRequestError("Invalid invoice id");
  }
  return id;
}

/**
 * GET /api/invoices/[id]/activity
 *
 * ADMIN ONLY - Activity logs contain sensitive information about
 * internal operations and should never be exposed to clients
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const invoiceId = await parseId(context.params);
    // SECURITY: Only admins can view activity logs
    await requireAdminAPI(req);

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");

    const activity = await getInvoiceActivity(invoiceId, {
      limit,
      offset,
    });

    return ok(activity);
  } catch (error) {
    return handleError(error, 'invoices.activity');
  }
}
