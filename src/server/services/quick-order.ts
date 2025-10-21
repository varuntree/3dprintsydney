import { getSettings } from "@/server/services/settings";
import type { SettingsInput } from "@/lib/schemas/settings";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, BadRequestError } from '@/lib/errors';
import { createInvoice, addInvoiceAttachment } from "@/server/services/invoices";
import {
  requireTmpFile,
  downloadTmpFileToBuffer,
  deleteTmpFile,
  saveTmpFile,
  updateTmpFile,
  type TmpFileMetadata,
} from "@/server/services/tmp-files";
import { saveOrderFile } from "@/server/services/order-files";
import { sliceFileWithCli } from "@/server/slicer/runner";
import path from "path";
import { promises as fsp } from "fs";
import os from "os";

export type QuickOrderItemInput = {
  fileId?: string;
  filename: string;
  materialId: number;
  materialName?: string;
  layerHeight: number;
  infill: number;
  quantity: number;
  metrics: { grams: number; timeSec: number; fallback?: boolean };
  supports?: {
    enabled: boolean;
    pattern: "normal" | "tree";
    angle: number;
    acceptedFallback?: boolean;
  };
};

export type QuickOrderShippingQuote = {
  code: string;
  label: string;
  baseAmount: number;
  amount: number;
  remoteSurcharge?: number;
  remoteApplied: boolean;
};

export type QuickOrderPrice = {
  items: {
    filename: string;
    unitPrice: number;
    quantity: number;
    total: number;
    breakdown: Record<string, number>;
  }[];
  subtotal: number;
  shipping: QuickOrderShippingQuote;
  taxRate?: number;
};

type ShippingLocation = {
  state?: string | null;
  postcode?: string | null;
};

let cachedSettings: Awaited<ReturnType<typeof getSettings>> | null = null;
let cachedSettingsAt = 0;
const SETTINGS_TTL_MS = 60_000;

function resolveShippingRegion(
  settings: SettingsInput,
  location: ShippingLocation,
): QuickOrderShippingQuote {
  const regions = settings.shippingRegions ?? [];
  const fallback =
    regions.find((region) => region.code === settings.defaultShippingRegion) ??
    regions[0];

  if (!fallback) {
    return {
      code: "none",
      label: "Shipping",
      baseAmount: 0,
      amount: 0,
      remoteApplied: false,
    };
  }

  const targetState = (location.state ?? "").trim().toUpperCase();
  const targetPostcode = (location.postcode ?? "").trim();

  let candidates = regions.filter((region) =>
    region.states?.some((state) => state.trim().toUpperCase() === targetState),
  );

  if (candidates.length === 0) {
    const quote = {
      code: fallback.code,
      label: fallback.label,
      baseAmount: fallback.baseAmount ?? 0,
      amount: fallback.baseAmount ?? 0,
      remoteSurcharge: fallback.remoteSurcharge,
      remoteApplied: false,
    };
    if (!targetState) {
      logger.info({
        scope: "quick-order.shipping",
        message: "No state provided; using default shipping region",
        data: { code: quote.code },
      });
    } else {
      logger.info({
        scope: "quick-order.shipping",
        message: "State not matched; using default shipping region",
        data: { state: targetState, code: quote.code },
      });
    }
    return quote;
  }

  if (targetPostcode) {
    const postcodeMatch = candidates.find((region) =>
      (region.postcodePrefixes ?? []).some((prefix) =>
        targetPostcode.startsWith(prefix),
      ),
    );
    if (postcodeMatch) {
      candidates = [postcodeMatch];
    }
  }

  const selected = candidates[0] ?? fallback;
  const baseAmount = Number(selected.baseAmount ?? 0);
  const remoteSurcharge =
    targetPostcode && (selected.postcodePrefixes ?? []).some((prefix) =>
      targetPostcode.startsWith(prefix),
    )
      ? Number(selected.remoteSurcharge ?? 0)
      : 0;
  const amount = Math.round((baseAmount + remoteSurcharge) * 100) / 100;

  return {
    code: selected.code,
    label: selected.label,
    baseAmount,
    amount,
    remoteSurcharge: remoteSurcharge > 0 ? remoteSurcharge : undefined,
    remoteApplied: remoteSurcharge > 0,
  };
}

/**
 * Calculate pricing for quick order items including materials, time, shipping, and tax
 * @param items - Array of items to price with metrics and material info
 * @param location - Shipping location for region-based shipping calculation
 * @returns Detailed pricing breakdown with item totals, subtotal, and shipping
 * @throws BadRequestError if settings not configured
 * @throws AppError if materials cannot be loaded
 */
export async function priceQuickOrder(
  items: QuickOrderItemInput[],
  location: ShippingLocation = {},
): Promise<QuickOrderPrice> {
  const now = Date.now();
  if (!cachedSettings || now - cachedSettingsAt > SETTINGS_TTL_MS) {
    cachedSettings = await getSettings();
    cachedSettingsAt = now;
  }
  const settings = cachedSettings;
  if (!settings) {
    throw new BadRequestError("Settings not configured");
  }

  const materialIds = Array.from(new Set(items.map((i) => i.materialId)));
  const supabase = getServiceSupabase();
  const { data: materials, error } = await supabase
    .from("materials")
    .select("id, cost_per_gram")
    .in("id", materialIds);

  if (error) {
    throw new AppError(`Failed to load materials: ${error.message}`, 'MATERIALS_LOAD_ERROR', 500);
  }

  const materialMap = new Map<number, number>(
    (materials ?? []).map((m) => [m.id, Number(m.cost_per_gram ?? 0)]),
  );

  const hourlyRate = settings.calculatorConfig.hourlyRate ?? 45;
  const setupFee = settings.calculatorConfig.setupFee ?? 20;
  const minimumPrice = settings.calculatorConfig.minimumPrice ?? 35;

  let subtotal = 0;
  const priced = items.map((it) => {
    const costPerGram = materialMap.get(it.materialId) ?? 0.05;
    const grams = Math.max(0, it.metrics.grams);
    const hours = Math.max(0, it.metrics.timeSec) / 3600;
    const materialCost = grams * costPerGram;
    const timeCost = hours * hourlyRate;
    const base = materialCost + timeCost + setupFee;
    const unitPrice = Math.max(minimumPrice, Math.round(base * 100) / 100);
    const total = Math.round(unitPrice * it.quantity * 100) / 100;
    subtotal += total;
    return {
      filename: it.filename,
      unitPrice,
      quantity: it.quantity,
      total,
      breakdown: { grams, hours, materialCost, timeCost, setupFee },
    };
  });

  const shipping = resolveShippingRegion(settings, location);

  return {
    items: priced,
    subtotal: Math.round(subtotal * 100) / 100,
    shipping,
    taxRate: settings.taxRate,
  };
}

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
 * Generate fallback metrics when slicing fails
 * @param fileId - The file ID that failed
 * @param error - The error that occurred
 * @returns Fallback metrics object
 */
export function generateFallbackMetrics(
  fileId: string,
  error: Error & { stderr?: string } | null,
) {
  return {
    id: fileId,
    timeSec: 3600,
    grams: 80,
    gcodeId: undefined as string | undefined,
    fallback: true,
    error: error?.stderr || error?.message || "Slicer failed",
  };
}

/**
 * Execute slicing with retry logic
 * @param srcPath - Path to the source file
 * @param settings - Slicing settings
 * @param maxAttempts - Maximum number of attempts
 * @returns Slicing metrics or null if failed
 */
export async function executeSlicingWithRetry(
  srcPath: string,
  settings: {
    layerHeight: number;
    infill: number;
    supports: {
      enabled: boolean;
      angle: number;
      pattern: "normal" | "tree";
    };
  },
  maxAttempts = 2,
): Promise<{ timeSec: number; grams: number; gcodePath?: string } | null> {
  let attempt = 0;
  let lastError: Error & { stderr?: string } | null = null;
  let metrics: { timeSec: number; grams: number; gcodePath?: string } | null = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await sliceFileWithCli(srcPath, {
        layerHeight: Number(settings.layerHeight),
        infill: Number(settings.infill),
        supports: {
          enabled: Boolean(settings.supports.enabled),
          angle: settings.supports.angle,
          pattern: settings.supports.pattern === "tree" ? "tree" : "normal",
        },
      });
      metrics = result;
      lastError = null;
      break;
    } catch (error) {
      lastError = error as Error & { stderr?: string };
      logger.error({
        scope: "quick-order.slice",
        message: "Slicer run failed",
        data: {
          attempt,
          layerHeight: settings.layerHeight,
          infill: settings.infill,
          supports: settings.supports,
        },
        error: lastError.stderr || lastError.message,
      });
      if (attempt >= maxAttempts) {
        break;
      }
    }
  }

  return metrics;
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
): Promise<{ invoiceId: number; checkoutUrl: string | null }> {
  // Recompute price server-side
  const priced = await priceQuickOrder(items, {
    state: typeof address?.state === "string" ? address.state : undefined,
    postcode: typeof address?.postcode === "string" ? address.postcode : undefined,
  });
  const shippingQuote = priced.shipping;
  const shippingCost = shippingQuote.amount;

  // Build invoice lines
  const lines = buildQuickOrderLines(items, priced);

  // Create invoice
  const invoice = await createInvoice({
    clientId,
    discountType: "NONE",
    discountValue: 0,
    shippingCost,
    shippingLabel: shippingQuote.label,
    lines,
  });

  // Process and save files
  await processQuickOrderFiles(
    items,
    invoice,
    { id: userId, clientId },
    address,
    shippingQuote,
  );

  // Stripe checkout
  let checkoutUrl: string | null = null;
  try {
    const stripe = await import("@/server/services/stripe");
    const res = await stripe.createStripeCheckoutSession(invoice.id);
    checkoutUrl = res.url ?? null;
  } catch {
    checkoutUrl = null;
  }

  return { invoiceId: invoice.id, checkoutUrl };
}

/**
 * Slice a quick order file with retry and fallback logic
 * @param fileId - The file ID to slice
 * @param userId - User ID
 * @param settings - Slicing settings (item from request)
 * @returns Slicing result with metrics and gcode ID
 */
export async function sliceQuickOrderFile(
  fileId: string,
  userId: number,
  settings: {
    layerHeight: number;
    infill: number;
    supports: {
      enabled: boolean;
      pattern: "normal" | "tree";
      angle: number;
    };
  },
): Promise<{
  id: string;
  timeSec: number;
  grams: number;
  gcodeId?: string;
  fallback: boolean;
  error?: string;
}> {
  let tmpDir: string | null = null;
  try {
    const record = await requireTmpFile(userId, fileId);
    const baseMeta = (record.metadata ?? {}) as TmpFileMetadata;
    const attempts = typeof baseMeta.attempts === "number" ? (baseMeta.attempts as number) + 1 : 1;

    // Update status to running
    await updateTmpFile(userId, fileId, {
      status: "running",
      metadata: {
        ...baseMeta,
        attempts,
        settings: {
          layerHeight: settings.layerHeight,
          infill: settings.infill,
          supports: settings.supports,
        },
        fallback: false,
        error: null,
      },
    });

    // Download and prepare file
    const buffer = await downloadTmpFileToBuffer(fileId);
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "slice-"));
    const src = path.join(tmpDir, path.basename(fileId) || `input-${Date.now()}.stl`);
    await fsp.writeFile(src, buffer);

    // Execute slicing with retry
    const metrics = await executeSlicingWithRetry(src, settings);

    // Handle failure with fallback
    if (!metrics) {
      const fallbackMetrics = generateFallbackMetrics(fileId, null);
      await updateTmpFile(userId, fileId, {
        status: "failed",
        metadata: {
          ...baseMeta,
          attempts,
          settings: {
            layerHeight: settings.layerHeight,
            infill: settings.infill,
            supports: settings.supports,
          },
          metrics: { timeSec: fallbackMetrics.timeSec, grams: fallbackMetrics.grams },
          fallback: true,
          error: fallbackMetrics.error,
        },
      });
      if (tmpDir) {
        await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
      }
      return fallbackMetrics;
    }

    // Save gcode file if available
    let gcodeId: string | undefined;
    if (metrics.gcodePath) {
      const buf = await fsp.readFile(metrics.gcodePath);
      const fileUserKey = fileId.split("/")[0];
      const { tmpId } = await saveTmpFile(
        Number(fileUserKey),
        path.basename(metrics.gcodePath),
        buf,
        "text/plain",
        {
          derivedFrom: fileId,
          type: "gcode",
        },
      );
      gcodeId = tmpId;
    }

    // Update status to completed
    await updateTmpFile(userId, fileId, {
      status: "completed",
      metadata: {
        ...baseMeta,
        attempts,
        settings: {
          layerHeight: settings.layerHeight,
          infill: settings.infill,
          supports: settings.supports,
        },
        metrics: { timeSec: metrics.timeSec, grams: metrics.grams },
        fallback: false,
        error: null,
        output: gcodeId ?? null,
      },
    });

    // Cleanup temp directory
    if (tmpDir) {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }

    return {
      id: fileId,
      timeSec: metrics.timeSec,
      grams: metrics.grams,
      gcodeId,
      fallback: false,
    };
  } catch (error) {
    if (tmpDir) {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
    throw error;
  }
}

/**
 * Process and save an oriented STL file
 * @param fileId - Original file ID
 * @param orientedFile - The oriented file data
 * @param userId - User ID
 * @returns New file information
 */
export async function processOrientedFile(
  fileId: string,
  orientedFile: { buffer: Buffer; filename: string; mimeType: string },
  userId: number,
): Promise<{
  success: true;
  newFileId: string;
  filename: string;
  size: number;
}> {
  // Verify original file exists and belongs to user
  await requireTmpFile(userId, fileId);

  // Save oriented STL as new tmp file
  const { record, tmpId } = await saveTmpFile(
    userId,
    orientedFile.filename,
    orientedFile.buffer,
    orientedFile.mimeType,
  );

  logger.info({
    scope: "quick-order.orient",
    data: {
      originalFileId: fileId,
      newFileId: tmpId,
      orientedSize: record.size_bytes,
      userId,
    },
  });

  return {
    success: true,
    newFileId: tmpId,
    filename: record.filename,
    size: record.size_bytes,
  };
}
