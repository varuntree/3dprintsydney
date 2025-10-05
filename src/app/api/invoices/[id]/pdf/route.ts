import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/server/api/respond";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { generateInvoicePdf } from "@/server/pdf/generator";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireInvoiceAccess(request, id);
    const { buffer, filename } = await generateInvoicePdf(id);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return fail(
      "PDF_ERROR",
      error instanceof Error ? error.message : "Failed to generate PDF",
      500,
    );
  }
}
