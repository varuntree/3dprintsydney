import { ok, fail, handleError } from "@/server/api/respond";
import { addInvoiceAttachment } from "@/server/services/invoices";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/zip",
];

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

    if (file.size > MAX_FILE_SIZE) {
      return fail("FILE_TOO_LARGE", "File exceeds 200MB limit", 413);
    }

    // Simple MIME allow-list check (best-effort; server stores anyway)
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return fail("UNSUPPORTED_TYPE", `Unsupported file type: ${file.type}`, 415);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await addInvoiceAttachment(id, {
      name: file.name,
      type: file.type,
      buffer,
    });

    return ok(attachment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.attachments.add");
  }
}
