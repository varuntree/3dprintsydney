import { ok, fail, handleError } from "@/server/api/respond";
import { removeInvoiceAttachment } from "@/server/services/invoices";

async function parseParams(
  paramsPromise: Promise<{ id: string; attachmentId: string }>,
) {
  const { attachmentId: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid attachment id");
  }
  return id;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const attachmentId = await parseParams(context.params);
    const attachment = await removeInvoiceAttachment(attachmentId);
    return ok(attachment);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid attachment id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.attachments.delete");
  }
}
