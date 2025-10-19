import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { priceQuickOrder, type QuickOrderItemInput } from "@/server/services/quick-order";
import { createInvoice, addInvoiceAttachment } from "@/server/services/invoices";
import {
  requireTmpFile,
  downloadTmpFileToBuffer,
  deleteTmpFile,
} from "@/server/services/tmp-files";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user.clientId) {
      return NextResponse.json({ error: "User not linked to client" }, { status: 400 });
    }
    const body = await req.json();
    const items: QuickOrderItemInput[] = body?.items ?? [];
    const address = body?.address ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    // Recompute price server-side
    const priced = await priceQuickOrder(items, {
      state: typeof address?.state === "string" ? address.state : undefined,
      postcode: typeof address?.postcode === "string" ? address.postcode : undefined,
    });
    const shippingQuote = priced.shipping;
    const shippingCost = shippingQuote.amount;

    // Build invoice lines
    const lines = priced.items.map((p, idx) => ({
      name: `3D Print: ${p.filename}`,
      description: [
        `Qty ${p.quantity}`,
        `Material ${items[idx]?.materialName ?? "Custom"}`,
        `Layer ${items[idx]?.layerHeight ?? 0}mm`,
        `Infill ${items[idx]?.infill ?? 0}%`,
        items[idx]?.supports?.enabled
          ? `Supports ${items[idx]?.supports?.pattern === "tree" ? "Organic" : "Standard"}`
          : "Supports off",
      ].join(" • "),
      quantity: p.quantity,
      unit: "part",
      unitPrice: p.unitPrice,
      orderIndex: idx,
      discountType: "NONE" as const,
      calculatorBreakdown: p.breakdown,
    }));

    const invoice = await createInvoice({
      clientId: user.clientId,
      shippingCost,
      shippingLabel: shippingQuote.label,
      lines,
    });

    // Ensure admin/client dashboards reflect new invoice promptly
    await Promise.all([
      revalidatePath("/invoices"),
      revalidatePath("/jobs"),
      revalidatePath("/clients"),
      revalidatePath("/client/orders"),
    ]).catch(() => {
      // best-effort; ignore revalidation failures
    });

    // Attach files + settings snapshot under invoice
    for (const it of items) {
      if (!it.fileId) continue;
      const tmpRecord = await requireTmpFile(user.id, it.fileId).catch(() => null);
      if (tmpRecord) {
        const buffer = await downloadTmpFileToBuffer(it.fileId);
        await addInvoiceAttachment(invoice.id, {
          name: tmpRecord.filename,
          type: tmpRecord.mime_type || "application/octet-stream",
          buffer,
        });
        await deleteTmpFile(user.id, it.fileId).catch(() => undefined);
      }
      const settingsJson = Buffer.from(JSON.stringify({
        filename: it.filename,
        materialId: it.materialId,
        materialName: it.materialName,
        layerHeight: it.layerHeight,
        infill: it.infill,
        quantity: it.quantity,
        metrics: it.metrics,
        supports: it.supports,
        address,
        shipping: shippingQuote,
      }, null, 2));
      await addInvoiceAttachment(invoice.id, { name: `${path.parse(it.filename).name}.settings.json`, type: "application/json", buffer: settingsJson });
    }

    // Stripe checkout
    let checkoutUrl: string | null = null;
    try {
      const stripe = await import("@/server/services/stripe");
      const res = await stripe.createStripeCheckoutSession(invoice.id);
      checkoutUrl = res.url ?? null;
    } catch {
      checkoutUrl = null;
    }

    return NextResponse.json({ data: { invoiceId: invoice.id, checkoutUrl } });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json({ error: e?.message ?? "Checkout failed" }, { status: e?.status ?? 400 });
  }
}
