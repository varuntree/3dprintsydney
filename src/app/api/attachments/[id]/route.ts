import { NextResponse, type NextRequest } from "next/server";
import { failAuth } from "@/server/api/respond";
import { readInvoiceAttachment } from "@/server/services/invoices";
import { requireAttachmentAccess } from "@/server/auth/permissions";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid attachment id");
  }
  return id;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireAttachmentAccess(request, id);
    const { url, attachment } = await readInvoiceAttachment(id);
    const downloadUrl = `${url}&download=${encodeURIComponent(attachment.filename)}`;
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid attachment id") {
      return failAuth(request, "INVALID_ID", error.message, 400);
    }
    return failAuth(request, 
      "ATTACHMENT_ERROR",
      error instanceof Error ? error.message : "Unable to read attachment",
      500,
    );
  }
}
