import { AppError, NotFoundError } from "@/lib/errors";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { createQuote } from "@/server/services/quotes";
import { logger } from "@/lib/logger";
import { DiscountType } from "@/lib/constants/enums";
import type { InvoiceLineType, ModellingComplexity } from "@/lib/types/modelling";

export async function reorderProject(projectId: number, clientId: number) {
  const scope = "projects.reorder";
  const startTime = Date.now();
  logger.info({ scope, message: "Reordering project", data: { projectId, clientId } });

  const supabase = getServiceSupabase();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, number, client_id, status, tax_rate, discount_type, discount_value, shipping_cost, shipping_label, invoice_items(*)",
    )
    .eq("id", projectId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    logger.error({ scope, message: "Failed to load invoice for reorder", error, data: { projectId, clientId } });
    throw new AppError(`Failed to load invoice: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  if (!invoice) {
    throw new NotFoundError("Project", projectId);
  }

  const lines = (invoice.invoice_items ?? []).map((item) => {
    const breakdown = item.calculator_breakdown as Record<string, unknown> | null;
    const modelling = breakdown?.modelling as
      | {
          brief?: string;
          complexity?: string;
          revisionCount?: number;
          hourlyRate?: number;
          estimatedHours?: number;
        }
      | null
      | undefined;
    return {
      productTemplateId: item.product_template_id ?? null,
      name: item.name,
      description: item.description ?? null,
      quantity: Number(item.quantity) || 0,
      unit: item.unit ?? null,
      unitPrice: Number(item.unit_price) || 0,
      discountType: (item.discount_type as DiscountType) ?? "NONE",
      discountValue: Number(item.discount_value) || 0,
      calculatorBreakdown: breakdown ?? undefined,
      lineType: (breakdown?.lineType as InvoiceLineType) ?? "PRINT",
      modellingBrief: modelling?.brief ?? "",
      modellingComplexity: modelling?.complexity as ModellingComplexity | undefined,
      modellingRevisionCount: modelling?.revisionCount ?? 0,
      modellingHourlyRate: modelling?.hourlyRate ?? 0,
      modellingEstimatedHours: modelling?.estimatedHours ?? 0,
    };
  });

  const quote = await createQuote({
    clientId: invoice.client_id,
    taxRate: Number(invoice.tax_rate) || 0,
    discountType: (invoice.discount_type as DiscountType) ?? "NONE",
    discountValue: Number(invoice.discount_value) || 0,
    shippingCost: Number(invoice.shipping_cost) || 0,
    shippingLabel: invoice.shipping_label ?? undefined,
    notes: `Reordered from Invoice ${invoice.number}`,
    expiryDate: undefined,
    lines,
  });

  const activityError = await supabase.from("activity_logs").insert({
    client_id: clientId,
    quote_id: quote.id,
    action: "QUOTE_REORDERED",
    message: `Project reordered from invoice ${invoice.number}`,
  });
  if (activityError.error) {
    logger.warn({ scope, message: "Failed to record reorder activity", error: activityError.error });
  }

  logger.timing(scope, startTime, { message: "Project reordered", data: { projectId, quoteId: quote.id } });
  return quote;
}
