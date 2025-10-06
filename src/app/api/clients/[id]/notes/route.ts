import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { addClientNote } from "@/server/services/clients";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid client id");
  }
  return id;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const note = await addClientNote(id, payload);
    return ok(note, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid note payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid client id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "clients.addNote");
  }
}
