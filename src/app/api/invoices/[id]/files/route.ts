import { NextRequest, NextResponse } from "next/server";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { getOrderFilesByInvoice } from "@/server/services/order-files";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/invoices/[id]/files
 * Lists all 3D model files attached to an invoice
 * Accessible by: Admins and the client who owns the invoice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const invoiceId = parseInt(resolvedParams.id, 10);

    if (isNaN(invoiceId)) {
      return fail("VALIDATION_ERROR", "Invalid invoice ID", 400);
    }

    // Check access permissions (admin or invoice owner)
    await requireInvoiceAccess(request, invoiceId);

    // Get all order files for this invoice
    const files = await getOrderFilesByInvoice(invoiceId);

    return ok(files.map((file) => ({
      id: file.id,
      filename: file.filename,
      fileType: file.file_type,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      metadata: file.metadata,
      uploadedAt: file.uploaded_at,
    })));
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'invoices.files', message: 'File operation failed', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
