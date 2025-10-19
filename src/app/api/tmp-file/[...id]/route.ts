import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { requireTmpFile, downloadTmpFileToBuffer } from "@/server/services/tmp-files";
import path from "path";

export const runtime = "nodejs";

/**
 * GET /api/tmp-file/[...id]
 *
 * Serves temporary files securely for 3D viewer preview
 * Only allows users to access their own uploaded files
 * Uses catch-all route to handle multi-segment file IDs (userId/uploadId/filename)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string[] }> }
) {
  try {
    const user = await requireUser(req);
    const { id: segments } = await context.params;

    // Join segments to reconstruct the full file ID (e.g., "3/bd3739aa/filename.stl")
    const fileId = segments.join("/");

    const record = await requireTmpFile(user.id, fileId);
    const buffer = await downloadTmpFileToBuffer(fileId);

    // Determine content type based on file extension
    const ext = path.extname(record.filename || "").toLowerCase();
    const contentType =
      record.mime_type ||
      (ext === ".stl"
        ? "application/octet-stream"
        : ext === ".3mf"
        ? "model/3mf+zip"
        : "application/octet-stream");

    // Return file with appropriate headers
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*", // Allow Three.js fetch
      },
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    if (e?.message === "Unauthorized") {
      return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
    }
    return NextResponse.json(
      { error: e?.message ?? "Failed to load file" },
      { status: e?.status ?? 500 }
    );
  }
}
