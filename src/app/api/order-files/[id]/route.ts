import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getOrderFile, getOrderFileDownloadUrl } from "@/server/services/order-files";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const fileId = parseInt(resolvedParams.id, 10);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    // Get file record
    const file = await getOrderFile(fileId);

    // Authorization check: Admin can access all files, clients can only access their own
    if (user.role !== "ADMIN" && user.clientId !== file.client_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get signed download URL (expires in 5 minutes)
    const downloadUrl = await getOrderFileDownloadUrl(fileId, 300);

    return NextResponse.json({
      data: {
        id: file.id,
        filename: file.filename,
        fileType: file.file_type,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
        downloadUrl,
        metadata: file.metadata,
        uploadedAt: file.uploaded_at,
      },
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json(
      { error: e?.message ?? "Failed to get order file" },
      { status: e?.status ?? 500 }
    );
  }
}
