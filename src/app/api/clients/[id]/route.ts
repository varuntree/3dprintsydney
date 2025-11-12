import { ZodError } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import {
  getClientDetail,
  updateClient,
  deleteClient,
} from "@/server/services/clients";
import { clientInputSchema } from "@/lib/schemas/clients";
import { requireAdmin } from "@/server/auth/api-helpers";
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
 * GET /api/clients/[id]
 * ADMIN ONLY
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const client = await getClientDetail(id);
    return okAuth(request, client);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid client id") {
      return failAuth(request, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(request, error, "clients.detail");
  }
}

/**
 * PUT /api/clients/[id]
 * ADMIN ONLY
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const body = await request.json();
    const validated = clientInputSchema.parse(body);
    const client = await updateClient(id, validated);
    return okAuth(request, client);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid client payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid client id") {
      return failAuth(request, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(request, error, "clients.update");
  }
}

/**
 * DELETE /api/clients/[id]
 * ADMIN ONLY
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const client = await deleteClient(id);
    return okAuth(request, client);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid client id") {
      return failAuth(request, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(request, error, "clients.delete");
  }
}
