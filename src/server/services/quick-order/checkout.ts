import { createInvoice, addInvoiceAttachment } from "@/server/services/invoices";
import { saveOrderFile } from "@/server/services/order-files";
import {
  requireTmpFile,
  downloadTmpFileToBuffer,
  deleteTmpFile,
} from "@/server/services/tmp-files";
import { getClientStudentDiscount, coerceStudentDiscount } from '@/server/services/student-discount';
import { logger } from "@/lib/logger";
import { priceQuickOrder } from "./pricing";
import type {
  QuickOrderItemInput,
  QuickOrderPrice,
  QuickOrderShippingQuote,
  QuickOrderInvoiceOptions,
} from "./types";
import path from "path";
import type { InvoiceLineType, ModellingComplexity } from "@/lib/types/modelling";

/**
 * Build invoice lines from quick order items and pricing
 * @param items - Original quick order items
 * @param priced - Priced items from priceQuickOrder
 * @returns Array of invoice lines ready for createInvoice
 */
export function buildQuickOrderLines(
  items: QuickOrderItemInput[],
  priced: QuickOrderPrice,
) {
  return priced.items.map((p, idx) => ({
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
    discountValue: 0,
    calculatorBreakdown: p.breakdown,
    lineType: "PRINT" as InvoiceLineType,
    modellingBrief: "",
    modellingComplexity: undefined as ModellingComplexity | undefined,
    modellingRevisionCount: 0,
    modellingHourlyRate: 0,
    modellingEstimatedHours: 0,
  }));
}

/**
 * Process and save quick order files to invoice attachments and order files
 * @param items - Quick order items with file IDs
 * @param invoice - The invoice to attach files to
 * @param user - User object with id and clientId
 * @param address - Shipping address for settings
 * @param shippingQuote - Shipping quote for settings
 */
export async function processQuickOrderFiles(
  items: QuickOrderItemInput[],
  invoice: { id: number },
  user: { id: number; clientId: number },
  address: Record<string, unknown>,
  shippingQuote: QuickOrderShippingQuote,
) {
  for (const it of items) {
    if (!it.fileId) continue;
    const tmpRecord = await requireTmpFile(user.id, it.fileId).catch(() => null);
    if (tmpRecord) {
      const buffer = await downloadTmpFileToBuffer(it.fileId);

      // Save 3D model file permanently (admins can now download these)
      await saveOrderFile({
        invoiceId: invoice.id,
        clientId: user.clientId,
        userId: user.id,
        filename: tmpRecord.filename,
        fileType: "model",
        contents: buffer,
        mimeType: tmpRecord.mime_type || "application/octet-stream",
        metadata: {
          originalSize: tmpRecord.size_bytes,
          uploadedFrom: "quick-order",
        },
        orientationData: tmpRecord.orientation_data ?? null,
      });

      // Also keep a copy in attachments for backward compatibility
      await addInvoiceAttachment(invoice.id, {
        name: tmpRecord.filename,
        type: tmpRecord.mime_type || "application/octet-stream",
        buffer,
      });

      // Clean up temporary file
      await deleteTmpFile(user.id, it.fileId).catch(() => undefined);
    }

    // Save print settings as a separate order file
    const settingsData = {
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
    };
    const settingsJson = Buffer.from(JSON.stringify(settingsData, null, 2));

    await saveOrderFile({
      invoiceId: invoice.id,
      clientId: user.clientId,
      userId: user.id,
      filename: `${path.parse(it.filename).name}.settings.json`,
      fileType: "settings",
      contents: settingsJson,
      mimeType: "application/json",
      metadata: settingsData,
    });

    // Also keep settings in attachments for backward compatibility
    await addInvoiceAttachment(invoice.id, {
      name: `${path.parse(it.filename).name}.settings.json`,
      type: "application/json",
      buffer: settingsJson,
    });
  }
}

/**
 * Create a quick order invoice with all files and settings
 * @param items - Quick order items
 * @param userId - User ID
 * @param clientId - Client ID
 * @param address - Shipping address
 * @returns Invoice with checkout URL
 */
export async function createQuickOrderInvoice(
  items: QuickOrderItemInput[],
  userId: number,
  clientId: number,
  address: Record<string, unknown> = {},
  options: QuickOrderInvoiceOptions = {},
): Promise<{ invoiceId: number; checkoutUrl: string | null }> {
  const studentDiscount = await getClientStudentDiscount(clientId);
  const { discountType, discountValue } = coerceStudentDiscount(studentDiscount);
  // Recompute price server-side
  const priced = await priceQuickOrder(items, {
    state: typeof address?.state === "string" ? address.state : undefined,
    postcode: typeof address?.postcode === "string" ? address.postcode : undefined,
  }, { discountType, discountValue });
  const shippingQuote = priced.shipping;
  const shippingCost = shippingQuote.amount;

  // Build invoice lines
  const lines = buildQuickOrderLines(items, priced);

  // Create invoice
  const invoice = await createInvoice({
    clientId,
    discountType,
    discountValue,
    shippingCost,
    shippingLabel: shippingQuote.label,
    paymentPreference: options.paymentPreference,
    creditRequestedAmount: options.creditRequestedAmount ?? 0,
    deliveryQuoteSnapshot: shippingQuote,
    lines,
  });

  // Apply credit only if explicitly requested
  let fullyPaidByCredit = false;
  if (options.creditRequestedAmount && options.creditRequestedAmount > 0) {
    try {
      const { applyWalletCreditToInvoice } = await import("@/server/services/credits");
      const { creditApplied, newBalanceDue } = await applyWalletCreditToInvoice(
        invoice.id,
        options.creditRequestedAmount,
      );
      if (creditApplied > 0) {
        logger.info({
          scope: 'quick-order.credit',
          data: { invoiceId: invoice.id, creditApplied, newBalanceDue }
        });
      }
      invoice.balanceDue = newBalanceDue;
      invoice.creditApplied += creditApplied;
      fullyPaidByCredit = newBalanceDue <= 0;
    } catch (error) {
      logger.error({
        scope: 'quick-order.credit',
        message: 'Failed to apply credit',
        error,
        data: { invoiceId: invoice.id, requested: options.creditRequestedAmount }
      });
    }
  }

  // Process and save files
  await processQuickOrderFiles(
    items,
    invoice,
    { id: userId, clientId },
    address,
    shippingQuote,
  );

  // Stripe checkout - only if there's a remaining balance
  let checkoutUrl: string | null = null;
  if (!fullyPaidByCredit) {
    try {
      const stripe = await import("@/server/services/stripe");
      const res = await stripe.createStripeCheckoutSession(invoice.id);
      checkoutUrl = res.url ?? null;
    } catch {
      checkoutUrl = null;
    }
  }

  return { invoiceId: invoice.id, checkoutUrl };
}
