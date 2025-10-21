import { logger } from "@/lib/logger";
import {
  calculateLineTotal,
  calculateDocumentTotals,
} from "@/lib/calculations";
import {
  type QuoteInput,
  type QuoteStatusInput,
} from "@/lib/schemas/quotes";
import { nextDocumentNumber } from "@/server/services/numbering";
import { ensureJobForInvoice, getJobCreationPolicy } from "@/server/services/jobs";
import { resolvePaymentTermsOptions } from "@/server/services/settings";
import { getServiceSupabase } from "@/server/supabase/service-client";
import {
  DiscountType as DiscountTypeEnum,
  InvoiceStatus,
  JobCreationPolicy,
  QuoteStatus as QuoteStatusEnum,
} from "@/lib/constants/enums";
import type {
  DiscountType as DiscountTypeValue,
  QuoteStatus as QuoteStatusValue,
} from "@/lib/constants/enums";
import { getInvoice } from "@/server/services/invoices";
import { AppError, NotFoundError } from "@/lib/errors";
import type {
  QuoteDetailDTO,
  QuoteSummaryDTO,
  QuoteLineDTO,
  QuoteFilters,
} from '@/lib/types/quotes';

function toDecimal(value: number | undefined | null) {
  if (value === undefined || value === null) return null;
  return String(Number.isFinite(value) ? value : 0);
}

function mapDiscount(type: QuoteInput["discountType"]): DiscountTypeValue {
  if (type === "PERCENT") return DiscountTypeEnum.PERCENT;
  if (type === "FIXED") return DiscountTypeEnum.FIXED;
  return DiscountTypeEnum.NONE;
}

function mapLineDiscount(
  type: QuoteInput["lines"][number]["discountType"],
): DiscountTypeValue {
  if (type === "PERCENT") return DiscountTypeEnum.PERCENT;
  if (type === "FIXED") return DiscountTypeEnum.FIXED;
  return DiscountTypeEnum.NONE;
}

type QuoteItemRow = {
  id: number;
  quote_id: number;
  product_template_id: number | null;
  name: string;
  description: string | null;
  quantity: string;
  unit: string | null;
  unit_price: string;
  discount_type: string;
  discount_value: string | null;
  total: string;
  order_index: number;
  calculator_breakdown: unknown;
};

type QuoteRow = {
  id: number;
  number: string;
  client_id: number;
  status: string;
  issue_date: string;
  expiry_date: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  decision_note: string | null;
  converted_invoice_id: number | null;
  tax_rate: string | null;
  discount_type: string;
  discount_value: string | null;
  shipping_cost: string | null;
  shipping_label: string | null;
  subtotal: string;
  total: string;
  tax_total: string;
  notes: string | null;
  terms: string | null;
  client?: { id: number; name: string; payment_terms?: string | null } | null;
  clients?:
    | { id: number; name: string; payment_terms?: string | null }
    | Array<{ id: number; name: string; payment_terms?: string | null }>
    | null;
};

type QuoteDetailRow = QuoteRow & {
  items?: QuoteItemRow[];
  quote_items?: QuoteItemRow[];
};

function extractClient(row: QuoteRow | QuoteDetailRow) {
  if (row.client) return row.client;
  if (!row.clients) return null;
  return Array.isArray(row.clients) ? row.clients[0] ?? null : row.clients;
}

function mapQuoteSummary(row: QuoteRow): QuoteSummaryDTO {
  const client = extractClient(row);
  return {
    id: row.id,
    number: row.number,
    clientName: client?.name ?? "",
    status: (row.status ?? "DRAFT") as QuoteStatusValue,
    total: Number(row.total ?? 0),
    issueDate: new Date(row.issue_date),
    expiryDate: row.expiry_date ? new Date(row.expiry_date) : null,
  };
}

function mapQuoteLines(items: QuoteDetailRow["items"] | QuoteDetailRow["quote_items"]): QuoteLineDTO[] {
  const source = items ?? [];
  return source.map((item) => ({
    id: item.id,
    productTemplateId: item.product_template_id ?? undefined,
    name: item.name,
    description: item.description ?? "",
    quantity: Number(item.quantity ?? 0),
    unit: item.unit ?? "",
    unitPrice: Number(item.unit_price ?? 0),
    discountType: (item.discount_type ?? "NONE") as DiscountTypeValue,
    discountValue: item.discount_value ? Number(item.discount_value) : 0,
    total: Number(item.total ?? 0),
    orderIndex: item.order_index,
    calculatorBreakdown: item.calculator_breakdown as Record<string, unknown> | null,
  }));
}

type ResolvedPaymentTerm = Awaited<ReturnType<typeof resolvePaymentTermsOptions>>["paymentTerms"][number] & {
  source: "client" | "default";
};

function mapQuoteDetail(row: QuoteDetailRow, paymentTerm: ResolvedPaymentTerm | null): QuoteDetailDTO {
  const client = extractClient(row);
  return {
    id: row.id,
    number: row.number,
    client: {
      id: row.client_id,
      name: client?.name ?? "",
    },
    status: (row.status ?? "DRAFT") as QuoteStatusValue,
    paymentTerms: paymentTerm,
    issueDate: new Date(row.issue_date),
    expiryDate: row.expiry_date ? new Date(row.expiry_date) : null,
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    declinedAt: row.declined_at ? new Date(row.declined_at) : null,
    decisionNote: row.decision_note ?? null,
    convertedInvoiceId: row.converted_invoice_id ?? null,
    taxRate: row.tax_rate ? Number(row.tax_rate) : 0,
    discountType: (row.discount_type ?? "NONE") as DiscountTypeValue,
    discountValue: row.discount_value ? Number(row.discount_value) : 0,
    shippingCost: row.shipping_cost ? Number(row.shipping_cost) : 0,
    shippingLabel: row.shipping_label ?? "",
    notes: row.notes ?? "",
    terms: row.terms ?? "",
    subtotal: row.subtotal ? Number(row.subtotal) : 0,
    total: row.total ? Number(row.total) : 0,
    taxTotal: row.tax_total ? Number(row.tax_total) : 0,
    lines: mapQuoteLines(row.items ?? row.quote_items),
  };
}

async function loadQuoteDetail(id: number): Promise<QuoteDetailDTO> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `*, client:clients(id, name, payment_terms), items:quote_items(*, product_template_id, name, description, quantity, unit, unit_price, discount_type, discount_value, total, order_index, calculator_breakdown)`
    )
    .eq("id", id)
    .order("order_index", { foreignTable: "quote_items", ascending: true })
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load quote: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError("Quote", id);
  }

  const client = (data as QuoteDetailRow).client;
  const { paymentTerms, defaultPaymentTerms } = await resolvePaymentTermsOptions();
  const trimmed = client?.payment_terms?.trim();

  let resolved: ResolvedPaymentTerm | null = null;
  if (trimmed) {
    const match = paymentTerms.find((term) => term.code === trimmed);
    if (match) {
      resolved = { ...match, source: "client" as const };
    }
  }
  if (!resolved) {
    const fallbackCode = defaultPaymentTerms;
    const fallback = paymentTerms.find((term) => term.code === fallbackCode) ?? paymentTerms[0];
    if (fallback) {
      resolved = { ...fallback, source: "default" as const };
    }
  }

  return mapQuoteDetail(data as QuoteDetailRow, resolved);
}

/**
 * Lists all quotes with optional filtering and pagination
 * @param options - Optional filters for quotes
 * @returns Array of quote summaries
 * @throws AppError if database query fails
 */
export async function listQuotes(options?: QuoteFilters) {
  const supabase = getServiceSupabase();
  const orderColumn =
    options?.sort === "number"
      ? "number"
      : options?.sort === "issueDate"
        ? "issue_date"
        : options?.sort === "createdAt"
          ? "created_at"
          : "created_at";
  const ascending = (options?.order ?? "desc") === "asc";

  let query = supabase
    .from("quotes")
    .select(
      "id, number, client_id, status, total, issue_date, expiry_date, clients(name)"
    )
    .order(orderColumn, { ascending, nullsFirst: !ascending });

  if (options?.q) {
    const term = options.q.trim();
    if (term.length > 0) {
      query = query.or(
        `number.ilike.%${term}%,clients.name.ilike.%${term}%`
      );
    }
  }

  if (options?.statuses?.length) {
    query = query.in("status", options.statuses);
  }

  if (typeof options?.limit === "number") {
    const limit = Math.max(1, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list quotes: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return (data ?? []).map((row) => mapQuoteSummary(row as QuoteRow));
}

/**
 * Retrieves a single quote by ID
 * @param id - The quote ID
 * @returns Complete quote details
 * @throws AppError if database query fails
 * @throws NotFoundError if quote not found
 */
export async function getQuote(id: number) {
  return loadQuoteDetail(id);
}

/**
 * Retrieves detailed quote information by ID
 * @param id - The quote ID
 * @returns Complete quote details with lines and payment terms
 * @throws AppError if database query fails
 * @throws NotFoundError if quote not found
 */
export async function getQuoteDetail(id: number) {
  return loadQuoteDetail(id);
}

function computeTotals(payload: QuoteInput) {
  const lineTotals = payload.lines.map((line) => ({
    total: calculateLineTotal({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue ?? 0,
    }),
  }));

  const docTotals = calculateDocumentTotals({
    lines: lineTotals,
    discountType: payload.discountType,
    discountValue: payload.discountValue ?? 0,
    shippingCost: payload.shippingCost ?? 0,
    taxRate: payload.taxRate ?? 0,
  });

  return {
    lineTotals,
    subtotal: docTotals.subtotal,
    total: docTotals.total,
    taxTotal: docTotals.tax,
    shippingCost: payload.shippingCost ?? 0,
  };
}

/**
 * Creates a new quote with line items
 * @param input - Quote creation data
 * @returns Created quote with full details
 * @throws AppError if database operations fail
 */
export async function createQuote(input: QuoteInput) {
  const totals = computeTotals(input);

  const supabase = getServiceSupabase();
  const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;
  const number = await nextDocumentNumber("quote");

  const { data: created, error } = await supabase
    .from("quotes")
    .insert({
      number,
      client_id: input.clientId,
      status: QuoteStatusEnum.DRAFT,
      issue_date: issueDate.toISOString(),
      expiry_date: expiryDate ? expiryDate.toISOString() : null,
      tax_rate: toDecimal(input.taxRate),
      discount_type: mapDiscount(input.discountType),
      discount_value: toDecimal(input.discountValue),
      shipping_cost: toDecimal(input.shippingCost),
      shipping_label: input.shippingLabel || null,
      notes: input.notes || null,
      terms: input.terms || null,
      subtotal: String(totals.subtotal),
      total: String(totals.total),
      tax_total: String(totals.taxTotal),
    })
    .select("id, client_id, number")
    .single();

  if (error || !created) {
    throw new AppError(`Failed to create quote: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const itemPayload = input.lines.map((line, index) => ({
    quote_id: created.id,
    product_template_id: line.productTemplateId ?? null,
    name: line.name,
    description: line.description || null,
    quantity: String(line.quantity),
    unit: line.unit || null,
    unit_price: String(line.unitPrice),
    discount_type: mapLineDiscount(line.discountType),
    discount_value: toDecimal(line.discountValue),
    total: String(totals.lineTotals[index].total),
    order_index: line.orderIndex ?? index,
    calculator_breakdown: line.calculatorBreakdown ?? null,
  }));

  if (itemPayload.length > 0) {
    const { error: itemError } = await supabase.from("quote_items").insert(itemPayload);
    if (itemError) {
      await supabase.from("quotes").delete().eq("id", created.id);
      throw new AppError(`Failed to insert quote items: ${itemError.message}`, 'DATABASE_ERROR', 500);
    }
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: created.client_id,
    quote_id: created.id,
    action: "QUOTE_CREATED",
    message: `Quote ${created.number} created`,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.create.activity",
      message: "Failed to record quote creation activity",
      error: activityError,
      data: { quoteId: created.id },
    });
  }

  logger.info({ scope: "quotes.create", data: { id: created.id } });

  return loadQuoteDetail(created.id);
}

/**
 * Updates an existing quote and replaces all line items
 * @param id - The quote ID
 * @param input - Updated quote data
 * @returns Updated quote with full details
 * @throws AppError if database operations fail
 */
export async function updateQuote(id: number, input: QuoteInput) {
  const totals = computeTotals(input);
  const supabase = getServiceSupabase();
  const issueDate = input.issueDate ? new Date(input.issueDate) : undefined;
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;

  const { data: updated, error } = await supabase
    .from("quotes")
    .update({
      client_id: input.clientId,
      issue_date: issueDate ? issueDate.toISOString() : undefined,
      expiry_date: expiryDate ? expiryDate.toISOString() : null,
      tax_rate: toDecimal(input.taxRate),
      discount_type: mapDiscount(input.discountType),
      discount_value: toDecimal(input.discountValue),
      shipping_cost: toDecimal(input.shippingCost),
      shipping_label: input.shippingLabel || null,
      notes: input.notes || null,
      terms: input.terms || null,
      subtotal: String(totals.subtotal),
      total: String(totals.total),
      tax_total: String(totals.taxTotal),
    })
    .eq("id", id)
    .select("id, client_id, number")
    .single();

  if (error || !updated) {
    throw new AppError(`Failed to update quote: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const { error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", id);
  if (deleteError) {
    throw new AppError(`Failed to reset quote items: ${deleteError.message}`, 'DATABASE_ERROR', 500);
  }

  const itemPayload = input.lines.map((line, index) => ({
    quote_id: id,
    product_template_id: line.productTemplateId ?? null,
    name: line.name,
    description: line.description || null,
    quantity: String(line.quantity),
    unit: line.unit || null,
    unit_price: String(line.unitPrice),
    discount_type: mapLineDiscount(line.discountType),
    discount_value: toDecimal(line.discountValue),
    total: String(totals.lineTotals[index].total),
    order_index: line.orderIndex ?? index,
    calculator_breakdown: line.calculatorBreakdown ?? null,
  }));

  if (itemPayload.length > 0) {
    const { error: insertError } = await supabase.from("quote_items").insert(itemPayload);
    if (insertError) {
      throw new AppError(`Failed to insert quote items: ${insertError.message}`, 'DATABASE_ERROR', 500);
    }
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: updated.client_id,
    quote_id: updated.id,
    action: "QUOTE_UPDATED",
    message: `Quote ${updated.number} updated`,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.update.activity",
      message: "Failed to record quote update activity",
      error: activityError,
      data: { quoteId: updated.id },
    });
  }

  logger.info({ scope: "quotes.update", data: { id } });

  return loadQuoteDetail(id);
}

/**
 * Updates the status of a quote
 * @param id - The quote ID
 * @param input - Status update data
 * @returns Updated quote with full details
 * @throws AppError if database update fails
 */
export async function updateQuoteStatus(id: number, input: QuoteStatusInput) {
  const supabase = getServiceSupabase();
  const { data: quote, error } = await supabase
    .from("quotes")
    .update({ status: input.status })
    .eq("id", id)
    .select("id, client_id, number")
    .single();

  if (error || !quote) {
    throw new AppError(`Failed to update quote status: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: quote.client_id,
    quote_id: quote.id,
    action: "QUOTE_STATUS",
    message: `Quote ${quote.number} marked ${input.status.toLowerCase()}`,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.status.activity",
      message: "Failed to record quote status activity",
      error: activityError,
      data: { quoteId: quote.id },
    });
  }

  return loadQuoteDetail(id);
}

/**
 * Deletes a quote and its line items
 * @param id - The quote ID
 * @returns Deleted quote metadata
 * @throws AppError if database delete fails
 */
export async function deleteQuote(id: number) {
  const supabase = getServiceSupabase();
  const { data: removed, error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .select("id, client_id, number")
    .single();

  if (error || !removed) {
    throw new AppError(`Failed to delete quote: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: removed.client_id,
    quote_id: removed.id,
    action: "QUOTE_DELETED",
    message: `Quote ${removed.number} deleted`,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.delete.activity",
      message: "Failed to record quote deletion activity",
      error: activityError,
      data: { quoteId: removed.id },
    });
  }

  logger.info({ scope: "quotes.delete", data: { id } });

  return removed;
}

/**
 * Converts a quote to an invoice with all line items
 * @param id - The quote ID
 * @returns Created invoice with full details
 * @throws AppError if database operations fail
 * @throws NotFoundError if quote not found
 */
export async function convertQuoteToInvoice(id: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("quotes")
    .select(`*, items:quote_items(*), client:clients(id, name)`)
    .eq("id", id)
    .order("order_index", { foreignTable: "quote_items", ascending: true })
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load quote: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError("Quote", id);
  }

  const quote = data as QuoteDetailRow & { client: { id: number; name: string } };
  const totals = {
    subtotal: Number(quote.subtotal ?? 0),
    total: Number(quote.total ?? 0),
    taxTotal: Number(quote.tax_total ?? 0),
  };

  const invoiceNumber = await nextDocumentNumber("invoice");
  const now = new Date();

  const { data: created, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      number: invoiceNumber,
      client_id: quote.client_id,
      source_quote_id: quote.id,
      converted_from_quote_id: quote.id,
      status: InvoiceStatus.PENDING,
      issue_date: now.toISOString(),
      due_date: null,
      tax_rate: quote.tax_rate,
      discount_type: quote.discount_type,
      discount_value: quote.discount_value,
      shipping_cost: quote.shipping_cost,
      shipping_label: quote.shipping_label,
      notes: quote.notes,
      terms: quote.terms,
      subtotal: String(totals.subtotal),
      total: String(totals.total),
      tax_total: String(totals.taxTotal),
      balance_due: String(totals.total),
    })
    .select("id, client_id, number")
    .single();

  if (invoiceError || !created) {
    throw new AppError(`Failed to create invoice: ${invoiceError?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const itemPayload = (quote.items ?? quote.quote_items ?? []).map((item, index) => ({
    invoice_id: created.id,
    product_template_id: item.product_template_id ?? null,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    discount_type: item.discount_type,
    discount_value: item.discount_value,
    total: item.total,
    order_index: item.order_index ?? index,
    calculator_breakdown: item.calculator_breakdown ?? null,
  }));

  if (itemPayload.length > 0) {
    const { error: itemsError } = await supabase.from("invoice_items").insert(itemPayload);
    if (itemsError) {
      await supabase.from("invoices").delete().eq("id", created.id);
      throw new AppError(`Failed to copy quote items to invoice: ${itemsError.message}`, 'DATABASE_ERROR', 500);
    }
  }

  const { error: updateQuoteError } = await supabase
    .from("quotes")
    .update({ status: QuoteStatusEnum.CONVERTED, converted_invoice_id: created.id })
    .eq("id", id);
  if (updateQuoteError) {
    logger.error({ scope: "quotes.convert", error: updateQuoteError, data: { quoteId: id } });
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: quote.client_id,
    quote_id: quote.id,
    invoice_id: created.id,
    action: "QUOTE_CONVERTED",
    message: `Quote ${quote.number} converted to invoice ${created.number}`,
  });
  if (activityError) {
    logger.warn({
      scope: "quotes.convert.activity",
      message: "Failed to record quote conversion activity",
      error: activityError,
      data: { quoteId: quote.id, invoiceId: created.id },
    });
  }

  logger.info({ scope: "quotes.convert", data: { quoteId: id, invoiceId: created.id } });

  const policy = await getJobCreationPolicy();
  if (policy === JobCreationPolicy.ON_INVOICE) {
    await ensureJobForInvoice(created.id);
  }

  return getInvoice(created.id);
}

/**
 * Marks a quote as sent and updates status to PENDING
 * @param id - The quote ID
 * @returns Updated quote with full details
 * @throws AppError if database update fails
 */
export async function sendQuote(id: number) {
  const supabase = getServiceSupabase();
  const { data: quote, error } = await supabase
    .from("quotes")
    .update({ sent_at: new Date().toISOString(), status: QuoteStatusEnum.PENDING })
    .eq("id", id)
    .select("id, client_id, number")
    .single();

  if (error || !quote) {
    throw new AppError(`Failed to mark quote sent: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: quote.client_id,
    quote_id: quote.id,
    action: "QUOTE_SENT",
    message: `Quote ${quote.number} sent`,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.send.activity",
      message: "Failed to record quote sent activity",
      error: activityError,
      data: { quoteId: quote.id },
    });
  }

  logger.info({ scope: "quotes.send", data: { id } });
  return loadQuoteDetail(id);
}

/**
 * Marks a quote as accepted with optional note
 * @param id - The quote ID
 * @param note - Optional acceptance note
 * @returns Updated quote with full details
 * @throws AppError if database update fails
 */
export async function acceptQuote(id: number, note?: string) {
  const supabase = getServiceSupabase();
  const { data: quote, error } = await supabase
    .from("quotes")
    .update({
      status: QuoteStatusEnum.ACCEPTED,
      accepted_at: new Date().toISOString(),
      decision_note: note ?? null,
    })
    .eq("id", id)
    .select("id, client_id, number")
    .single();

  if (error || !quote) {
    throw new AppError(`Failed to accept quote: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: quote.client_id,
    quote_id: quote.id,
    action: "QUOTE_ACCEPTED",
    message: `Quote ${quote.number} accepted`,
    metadata: note ? { note } : null,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.accept.activity",
      message: "Failed to record quote acceptance",
      error: activityError,
      data: { quoteId: quote.id },
    });
  }

  logger.info({ scope: "quotes.accept", data: { id } });
  return loadQuoteDetail(id);
}

/**
 * Marks a quote as declined with optional note
 * @param id - The quote ID
 * @param note - Optional decline reason
 * @returns Updated quote with full details
 * @throws AppError if database update fails
 */
export async function declineQuote(id: number, note?: string) {
  const supabase = getServiceSupabase();
  const { data: quote, error } = await supabase
    .from("quotes")
    .update({
      status: QuoteStatusEnum.DECLINED,
      declined_at: new Date().toISOString(),
      decision_note: note ?? null,
    })
    .eq("id", id)
    .select("id, client_id, number")
    .single();

  if (error || !quote) {
    throw new AppError(`Failed to decline quote: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: quote.client_id,
    quote_id: quote.id,
    action: "QUOTE_DECLINED",
    message: `Quote ${quote.number} declined`,
    metadata: note ? { note } : null,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.decline.activity",
      message: "Failed to record quote decline",
      error: activityError,
      data: { quoteId: quote.id },
    });
  }

  logger.info({ scope: "quotes.decline", data: { id } });
  return loadQuoteDetail(id);
}

/**
 * Creates a duplicate of an existing quote with all line items
 * @param id - The quote ID to duplicate
 * @returns New quote ID and number
 * @throws AppError if database operations fail
 * @throws NotFoundError if quote not found
 */
export async function duplicateQuote(id: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("quotes")
    .select(`*, items:quote_items(*)`)
    .eq("id", id)
    .order("order_index", { foreignTable: "quote_items", ascending: true })
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load quote: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError("Quote", id);
  }

  const quote = data as QuoteDetailRow;
  const number = await nextDocumentNumber("quote");
  const now = new Date();

  const { data: created, error: duplicateError } = await supabase
    .from("quotes")
    .insert({
      number,
      client_id: quote.client_id,
      status: QuoteStatusEnum.DRAFT,
      issue_date: now.toISOString(),
      expiry_date: quote.expiry_date,
      tax_rate: quote.tax_rate,
      discount_type: quote.discount_type,
      discount_value: quote.discount_value,
      shipping_cost: quote.shipping_cost,
      shipping_label: quote.shipping_label,
      notes: quote.notes,
      terms: quote.terms,
      subtotal: quote.subtotal,
      total: quote.total,
      tax_total: quote.tax_total,
    })
    .select("id, client_id, number")
    .single();

  if (duplicateError || !created) {
    throw new AppError(`Failed to duplicate quote: ${duplicateError?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  const itemPayload = (quote.items ?? quote.quote_items ?? []).map((item, index) => ({
    quote_id: created.id,
    product_template_id: item.product_template_id ?? null,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    discount_type: item.discount_type,
    discount_value: item.discount_value,
    total: item.total,
    order_index: item.order_index ?? index,
    calculator_breakdown: item.calculator_breakdown ?? null,
  }));

  if (itemPayload.length > 0) {
    const { error: itemsError } = await supabase.from("quote_items").insert(itemPayload);
    if (itemsError) {
      await supabase.from("quotes").delete().eq("id", created.id);
      throw new AppError(`Failed to duplicate quote items: ${itemsError.message}`, 'DATABASE_ERROR', 500);
    }
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    client_id: created.client_id,
    quote_id: created.id,
    action: "QUOTE_DUPLICATED",
    message: `Quote ${created.number} duplicated from ${quote.number}`,
  });

  if (activityError) {
    logger.warn({
      scope: "quotes.duplicate.activity",
      message: "Failed to record quote duplication",
      error: activityError,
      data: { quoteId: created.id },
    });
  }

  logger.info({ scope: "quotes.duplicate", data: { sourceId: id, newId: created.id } });

  return { id: created.id, number: created.number };
}
