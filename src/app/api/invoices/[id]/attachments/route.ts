import { ok, fail, handleError } from "@/server/api/respond";
import { uploadInvoiceAttachment } from "@/server/services/invoices";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    // Restrict attachment uploads to admin for now
    await requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return fail("INVALID_FILE", "File upload missing", 400);
    }

    // Delegate validation and upload to service layer
    const attachment = await uploadInvoiceAttachment(id, file);

    return ok(attachment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.attachments.add");
  }
}
