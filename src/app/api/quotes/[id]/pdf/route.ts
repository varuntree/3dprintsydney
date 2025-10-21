import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/server/api/respond";
import { generateQuotePdf } from "@/server/pdf/generator";
import { requireAdmin } from "@/server/auth/api-helpers";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid quote id");
  }
  return id;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const { buffer, filename } = await generateQuotePdf(id);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid quote id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return fail(
      "PDF_ERROR",
      error instanceof Error ? error.message : "Failed to generate PDF",
      500,
    );
  }
}
