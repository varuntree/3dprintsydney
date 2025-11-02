import { ZodError } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { requireAdmin } from "@/server/auth/api-helpers";
import { addClientCredit } from "@/server/services/credits";
import { creditAdjustmentSchema } from "@/lib/schemas/clients";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid client id");
  }
  return id;
}

/**
 * POST /api/clients/[id]/credit
 * Add credit to client wallet
 * ADMIN ONLY
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = await parseId(context.params);
    const admin = await requireAdmin(request);

    const body = await request.json();
    const validated = creditAdjustmentSchema.parse(body);

    const result = await addClientCredit(
      clientId,
      validated.amount,
      admin.id,
      validated.reason,
      validated.notes
    );

    return okAuth(req, result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid credit payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid client id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "clients.credit.add");
  }
}
