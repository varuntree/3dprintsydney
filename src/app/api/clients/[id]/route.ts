import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import {
  getClientDetail,
  updateClient,
  deleteClient,
} from "@/server/services/clients";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid client id");
  }
  return id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const client = await getClientDetail(id);
    return ok(client);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid client id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "clients.detail");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const client = await updateClient(id, payload);
    return ok(client);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid client payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid client id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "clients.update");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const client = await deleteClient(id);
    return ok(client);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid client id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "clients.delete");
  }
}
