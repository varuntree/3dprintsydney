import { NextResponse } from "next/server";
import { fail } from "@/server/api/respond";
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
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
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
