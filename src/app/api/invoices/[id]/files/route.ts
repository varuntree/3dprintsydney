import { NextRequest, NextResponse } from "next/server";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { getOrderFilesByInvoice } from "@/server/services/order-files";

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
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    // Check access permissions (admin or invoice owner)
    await requireInvoiceAccess(request, invoiceId);

    // Get all order files for this invoice
    const files = await getOrderFilesByInvoice(invoiceId);

    return NextResponse.json({
      data: files.map((file) => ({
        id: file.id,
        filename: file.filename,
        fileType: file.file_type,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
        metadata: file.metadata,
        uploadedAt: file.uploaded_at,
      })),
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json(
      { error: e?.message ?? "Failed to list order files" },
      { status: e?.status ?? 500 }
    );
  }
}
