import { addDays, format } from 'date-fns';
import { logger } from '@/lib/logger';
import { DiscountType, InvoiceStatus, JobStatus, PaymentMethod } from '@/lib/constants/enums';
import {
  calculateLineTotal,
  calculateDocumentTotals,
} from '@/lib/calculations';
import {
  type InvoiceInput,
  type PaymentInput,
} from '@/lib/schemas/invoices';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { nextDocumentNumber } from '@/server/services/numbering';
import { getJobCreationPolicy, ensureJobForInvoice } from '@/server/services/jobs';
import { resolvePaymentTermsOptions, getSettings } from '@/server/services/settings';
import { emailService } from '@/server/services/email';
import { getAppUrl } from '@/lib/env';
import { formatCurrency } from '@/lib/utils/formatters';
import { uploadInvoiceAttachment as uploadToStorage, deleteInvoiceAttachment, getAttachmentSignedUrl, deleteFromStorage } from '@/server/storage/supabase';
import { coerceStudentDiscount, getClientStudentDiscount } from '@/server/services/student-discount';
import { AppError, NotFoundError, BadRequestError } from '@/lib/errors';
import { validateInvoiceAttachment } from '@/lib/utils/validators';
import type {
  InvoiceDetailDTO,
  InvoiceSummaryDTO,
  InvoiceFilters,
  PaymentTermDTO,
} from '@/lib/types/invoices';

function toDecimal(value: number | undefined | null) {
  if (value === undefined || value === null) return null;
  return Number.isFinite(value) ? String(value) : '0';
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeTotals(payload: InvoiceInput) {
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

type ResolvedPaymentTerm = PaymentTermDTO & { source: 'client' | 'default' };

async function resolveClientPaymentTerm(clientId: number): Promise<ResolvedPaymentTerm> {
  const supabase = getServiceSupabase();
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('payment_terms')
    .eq('id', clientId)
    .maybeSingle();
  if (clientError) {
    throw new AppError(`Failed to fetch client: ${clientError.message}`, 'DATABASE_ERROR', 500);
  }
  if (!client) {
    throw new NotFoundError('Client', clientId);
  }
  const { paymentTerms, defaultPaymentTerms } = await resolvePaymentTermsOptions();
  if (paymentTerms.length === 0) {
    return {
      code: defaultPaymentTerms,
      label: defaultPaymentTerms,
      days: 0,
      source: 'default',
    };
  }
  const candidateCode = client.payment_terms?.trim() || defaultPaymentTerms;
  const match = paymentTerms.find((term) => term.code === candidateCode);
  if (match) {
    return { ...match, source: client.payment_terms ? 'client' : 'default' };
  }
  const fallback = paymentTerms.find((term) => term.code === defaultPaymentTerms);
  if (fallback) {
    return { ...fallback, source: 'default' };
  }
  const [first] = paymentTerms;
  return { ...first, source: 'default' };
}

function deriveDueDate(issueDate: Date, term: ResolvedPaymentTerm, explicit?: Date | null) {
  if (explicit) {
    return explicit;
  }
  if (!term || term.days <= 0) {
    return issueDate;
  }
  return addDays(issueDate, term.days);
}

type InvoiceClientRecord = {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: unknown;
  abn?: string | null;
  payment_terms?: string | null;
};

type InvoiceRow = {
  id: number;
  number: string;
  client_id: number;
  status: string;
  total: string;
  balance_due: string;
  issue_date: string;
  due_date: string | null;
  stripe_checkout_url: string | null;
  created_at?: string;
  updated_at?: string;
  clients?: InvoiceClientRecord | InvoiceClientRecord[] | null;
};

type InvoiceDetailRow = InvoiceRow & {
  notes: string | null;
  terms: string | null;
  tax_rate: string | null;
  discount_type: string;
  discount_value: string | null;
  shipping_cost: string | null;
  shipping_label: string | null;
  subtotal: string;
  tax_total: string;
  po_number: string | null;
  internal_notes: string | null;
  calculator_snapshot: unknown;
  paid_at: string | null;
  credit_applied: string | null;
  payment_preference: string | null;
  credit_requested_amount: string | null;
  delivery_quote_snapshot: unknown;
  attachments: Array<{ id: number; filename: string; filetype: string | null; size_bytes: number; storage_key: string; uploaded_at: string | null }>;
  items: Array<{
    id: number;
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
  }>;
  payments: Array<{
    id: number;
    amount: string;
    method: string;
    reference: string | null;
    processor: string | null;
    processor_id: string | null;
    notes: string | null;
    paid_at: string;
  }>;
  jobs?: Array<{
    id: number;
    title: string;
    status: string;
    printer_id: number | null;
    notes: string | null;
    updated_at: string;
    printers?: { name: string | null } | null;
  }>;
};

function extractClientRecord(row: InvoiceRow | InvoiceDetailRow): InvoiceClientRecord | null {
  if (!row.clients) return null;
  if (Array.isArray(row.clients)) {
    return row.clients[0] ?? null;
  }
  return row.clients;
}

function coerceClientAddress(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const raw = typeof record.raw === "string" ? record.raw.trim() : "";
    if (raw.length > 0) {
      return raw;
    }
    const formatted = typeof record.formatted === "string" ? record.formatted.trim() : "";
    if (formatted.length > 0) {
      return formatted;
    }
    const parts: string[] = [];
    const keys = ["line1", "line2", "city", "state", "postalCode", "country"] as const;
    for (const key of keys) {
      const valuePart = record[key];
      if (typeof valuePart === "string" && valuePart.trim().length > 0) {
        parts.push(valuePart.trim());
      }
    }
    if (parts.length > 0) {
      return parts.join(", ");
    }
  }
  return null;
}

type InvoiceRevertRow = {
  id: number;
  number: string;
  client_id: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  tax_rate: string | null;
  discount_type: string;
  discount_value: string | null;
  shipping_cost: string | null;
  shipping_label: string | null;
  subtotal: string;
  tax_total: string;
  total: string;
  notes: string | null;
  terms: string | null;
  calculator_snapshot: unknown;
  invoice_items: Array<{
    id: number;
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
  }>;
  payments: Array<{ id: number; amount: string | null }>;
  attachments: Array<{ id: number; storage_key: string }>;
};

function mapInvoiceSummary(row: InvoiceRow): InvoiceSummaryDTO {
  const client = extractClientRecord(row);
  return {
    id: row.id,
    number: row.number,
    clientName: client?.name ?? '',
    status: (row.status ?? 'PENDING') as InvoiceStatus,
    total: Number(row.total ?? 0),
    balanceDue: Number(row.balance_due ?? 0),
    issueDate: new Date(row.issue_date),
    dueDate: row.due_date ? new Date(row.due_date) : null,
    hasStripeLink: Boolean(row.stripe_checkout_url),
  };
}

/**
 * Lists all invoices with optional filtering and pagination
 * @param options - Optional filters for invoices
 * @returns Array of invoice summaries
 * @throws AppError if database query fails
 */
export async function listInvoices(options?: InvoiceFilters) {
  const supabase = getServiceSupabase();
  let query = supabase
    .from('invoices')
    .select('id, number, client_id, status, total, balance_due, issue_date, due_date, stripe_checkout_url, clients(name)', { count: 'exact' })
    .order(options?.sort === 'number' ? 'number' : options?.sort === 'dueDate' ? 'due_date' : options?.sort === 'createdAt' ? 'created_at' : 'issue_date', {
      ascending: (options?.order ?? 'desc') === 'asc',
      nullsFirst: false,
    });

  if (options?.q) {
    const term = options.q.trim();
    query = query.or(`number.ilike.%${term}%,clients.name.ilike.%${term}%`);
  }

  if (options?.statuses?.length) {
    query = query.in('status', options.statuses);
  }

  if (typeof options?.limit === 'number') {
    const limit = Math.max(1, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list invoices: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return (data ?? []).map((row) => mapInvoiceSummary(row as InvoiceRow));
}

function mapInvoiceDetail(row: InvoiceDetailRow, paymentTerm: ResolvedPaymentTerm | null): InvoiceDetailDTO {
  const client = extractClientRecord(row);
  return {
    id: row.id,
    number: row.number,
    status: (row.status ?? 'PENDING') as InvoiceStatus,
    total: Number(row.total ?? 0),
    balanceDue: Number(row.balance_due ?? 0),
    creditApplied: Number(row.credit_applied ?? 0),
    issueDate: new Date(row.issue_date),
    dueDate: row.due_date ? new Date(row.due_date) : null,
    notes: row.notes ?? '',
    terms: row.terms ?? '',
    taxRate: row.tax_rate ? Number(row.tax_rate) : undefined,
    shippingCost: row.shipping_cost ? Number(row.shipping_cost) : 0,
    shippingLabel: row.shipping_label ?? '',
    subtotal: Number(row.subtotal ?? 0),
    taxTotal: Number(row.tax_total ?? 0),
    discountType: (row.discount_type ?? 'NONE') as DiscountType,
    discountValue: row.discount_value ? Number(row.discount_value) : 0,
    poNumber: row.po_number ?? '',
    internalNotes: row.internal_notes ?? '',
    calculatorSnapshot: row.calculator_snapshot ?? null,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    stripeCheckoutUrl: row.stripe_checkout_url ?? null,
    paymentPreference: row.payment_preference ?? null,
    creditRequestedAmount: Number(row.credit_requested_amount ?? 0),
    deliveryQuoteSnapshot: row.delivery_quote_snapshot ?? null,
    client: {
      id: row.client_id,
      name: client?.name ?? '',
      company: client?.company ?? null,
      email: client?.email ?? null,
      phone: client?.phone ?? null,
      address: coerceClientAddress(client?.address),
      abn: client?.abn ?? null,
    },
    paymentTerms: paymentTerm ? { ...paymentTerm } : null,
    attachments: (row.attachments ?? []).map((att) => ({
      id: att.id,
      filename: att.filename,
      filetype: att.filetype,
      size: att.size_bytes,
      storageKey: att.storage_key,
      uploadedAt: new Date(att.uploaded_at ?? row.updated_at ?? row.created_at ?? new Date().toISOString()),
    })),
    lines: (row.items ?? []).map((item) => {
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
        id: item.id,
        productTemplateId: item.product_template_id ?? undefined,
        name: item.name,
        description: item.description ?? '',
        quantity: Number(item.quantity ?? 0),
        unit: item.unit ?? '',
        unitPrice: Number(item.unit_price ?? 0),
        discountType: (item.discount_type ?? 'NONE') as DiscountType,
        discountValue: item.discount_value ? Number(item.discount_value) : 0,
        total: Number(item.total ?? 0),
        orderIndex: item.order_index,
        calculatorBreakdown: breakdown,
        lineType: (breakdown?.lineType as 'PRINT' | 'MODELLING') ?? 'PRINT',
        modellingBrief: modelling?.brief ?? '',
        modellingComplexity: modelling?.complexity ?? undefined,
        modellingRevisionCount: modelling?.revisionCount ?? 0,
        modellingHourlyRate: modelling?.hourlyRate ?? 0,
        modellingEstimatedHours: modelling?.estimatedHours ?? 0,
      };
    }),
    payments: (row.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      method: (payment.method ?? PaymentMethod.OTHER) as PaymentMethod,
      reference: payment.reference ?? '',
      processor: payment.processor ?? '',
      processorId: payment.processor_id ?? '',
      notes: payment.notes ?? '',
      paidAt: payment.paid_at ? new Date(payment.paid_at) : new Date(),
    })),
    jobs: (row.jobs ?? []).map((job) => ({
      id: job.id,
      title: job.title,
      status: (job.status ?? 'PRE_PROCESSING') as JobStatus,
      printerId: job.printer_id ?? null,
      printerName: job.printers?.name ?? null,
      notes: job.notes ?? '',
      updatedAt: new Date(job.updated_at),
    })),
  };
}

/**
 * Retrieves a complete invoice with all related data
 * @param id - The invoice ID
 * @returns Complete invoice details
 * @throws AppError if database query fails
 * @throws NotFoundError if invoice not found
 */
export async function getInvoice(id: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .select(`*, attachments(id, filename, filetype, size_bytes, storage_key, uploaded_at), items:invoice_items(*), payments(*), clients(*), jobs(*, printers(name))`)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load invoice: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError('Invoice', id);
  }
  const paymentTerm = await resolveClientPaymentTerm((data as InvoiceDetailRow).client_id);
  return mapInvoiceDetail(data as InvoiceDetailRow, paymentTerm);
}

/**
 * Retrieves detailed invoice information by ID
 * @param id - The invoice ID
 * @returns Complete invoice details with all relations
 * @throws AppError if database query fails
 * @throws NotFoundError if invoice not found
 */
export async function getInvoiceDetail(id: number) {
  return getInvoice(id);
}

async function insertInvoiceActivities(invoiceId: number, clientId: number, action: string, message: string, metadata?: Record<string, unknown>) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('activity_logs').insert({
    invoice_id: invoiceId,
    client_id: clientId,
    action,
    message,
    metadata: metadata ?? null,
  });
  if (error) {
    throw new AppError(`Failed to insert activity: ${error.message}`, 'DATABASE_ERROR', 500);
  }
}

/**
 * Creates a new invoice with line items
 * @param input - Invoice creation data
 * @returns Created invoice with full details
 * @throws AppError if database operations fail
 */
export async function createInvoice(input: InvoiceInput) {
  const supabase = getServiceSupabase();
  const studentDiscount = await getClientStudentDiscount(input.clientId);
  const coercedDiscount = coerceStudentDiscount(studentDiscount);
  const payload: InvoiceInput = studentDiscount.eligible
    ? {
        ...input,
        discountType: coercedDiscount.discountType,
        discountValue: coercedDiscount.discountValue,
      }
    : { ...input, discountValue: input.discountValue ?? 0 };
  const totals = computeTotals(payload);
  const issueDate = payload.issueDate ? new Date(payload.issueDate) : new Date();
  const paymentTerm = await resolveClientPaymentTerm(payload.clientId);
  const dueDate = deriveDueDate(issueDate, paymentTerm, payload.dueDate ? new Date(payload.dueDate) : null);
  const number = await nextDocumentNumber('invoice');

  const invoiceRecord = {
    number,
    client_id: payload.clientId,
    status: InvoiceStatus.PENDING,
    issue_date: issueDate.toISOString(),
    due_date: dueDate?.toISOString() ?? '',
    tax_rate: toDecimal(payload.taxRate) ?? '',
    discount_type: payload.discountType,
    discount_value: toDecimal(payload.discountValue) ?? '',
    shipping_cost: toDecimal(payload.shippingCost) ?? '',
    shipping_label: payload.shippingLabel ?? '',
    notes: payload.notes ?? '',
    terms: payload.terms ?? '',
    po_number: payload.poNumber ?? '',
    payment_preference: payload.paymentPreference ?? '',
    credit_requested_amount: toDecimal(payload.creditRequestedAmount) ?? '0',
    delivery_quote_snapshot: payload.deliveryQuoteSnapshot ?? null,
    subtotal: String(totals.subtotal),
    total: String(totals.total),
    tax_total: String(totals.taxTotal),
    balance_due: String(totals.total),
  };

  const lineInserts = payload.lines.map((line, index) => {
    const breakdown = {
      ...(line.calculatorBreakdown ?? {}),
      lineType: line.lineType,
    } as Record<string, unknown>;
    if (line.lineType === "MODELLING") {
      breakdown.modelling = {
        brief: line.modellingBrief ?? "",
        complexity: line.modellingComplexity ?? "SIMPLE",
        revisionCount: line.modellingRevisionCount ?? 0,
        hourlyRate: line.modellingHourlyRate ?? 0,
        estimatedHours: line.modellingEstimatedHours ?? 0,
      };
    }
    return {
      product_template_id: line.productTemplateId ?? '',
      name: line.name,
      description: line.description ?? '',
      quantity: String(line.quantity),
      unit: line.unit ?? '',
      unit_price: String(line.unitPrice),
      discount_type: line.discountType,
      discount_value: toDecimal(line.discountValue) ?? '',
      total: String(totals.lineTotals[index].total),
      order_index: String(line.orderIndex ?? index),
      calculator_breakdown: breakdown,
    };
  });

  const { data, error } = await supabase.rpc('create_invoice_with_items', {
    payload: {
      invoice: invoiceRecord,
      lines: lineInserts,
    },
  });

  if (error || !data?.invoice) {
    throw new AppError(`Failed to create invoice: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  const invoiceId = (data.invoice as { id: number }).id;

  await insertInvoiceActivities(invoiceId, payload.clientId, 'INVOICE_CREATED', `Invoice ${number} created`);

  const policy = await getJobCreationPolicy();
  if (policy === 'ON_INVOICE') {
    await ensureJobForInvoice(invoiceId);
  }

  // Send email notification to client
  const { data: client } = await supabase
    .from("clients")
    .select("email, business_name, contact_name")
    .eq("id", payload.clientId)
    .single();

  if (client?.email) {
    const settings = await getSettings();
    await emailService.sendInvoiceCreated(client.email, {
      clientName: client.business_name || client.contact_name,
      invoiceNumber: number,
      businessName: settings.businessName,
      total: formatCurrency(totals.total, settings.defaultCurrency || 'AUD'),
      dueDate: dueDate ? format(dueDate, 'PPP') : 'N/A',
      viewUrl: `${getAppUrl()}/client/invoices/${invoiceId}`,
      customMessage: settings.emailTemplates?.invoice_created?.body || "Your invoice is ready.",
    });
  }

  logger.info({ scope: 'invoices.create', data: { id: invoiceId } });

  return getInvoice(invoiceId);
}

/**
 * Updates an existing invoice and replaces all line items
 * @param id - The invoice ID
 * @param input - Updated invoice data
 * @returns Updated invoice with full details
 * @throws AppError if database operations fail
 */
export async function updateInvoice(id: number, input: InvoiceInput) {
  const supabase = getServiceSupabase();
  const studentDiscount = await getClientStudentDiscount(input.clientId);
  const coercedDiscount = coerceStudentDiscount(studentDiscount);
  const payload: InvoiceInput = studentDiscount.eligible
    ? {
        ...input,
        discountType: coercedDiscount.discountType,
        discountValue: coercedDiscount.discountValue,
      }
    : { ...input, discountValue: input.discountValue ?? 0 };
  const totals = computeTotals(payload);
  const issueDate = payload.issueDate ? new Date(payload.issueDate) : new Date();
  const paymentTerm = await resolveClientPaymentTerm(payload.clientId);
  const dueDate = deriveDueDate(issueDate, paymentTerm, payload.dueDate ? new Date(payload.dueDate) : null);

  const invoiceRecord = {
    client_id: payload.clientId,
    issue_date: issueDate.toISOString(),
    due_date: dueDate?.toISOString() ?? '',
    tax_rate: toDecimal(payload.taxRate) ?? '',
    discount_type: payload.discountType,
    discount_value: toDecimal(payload.discountValue) ?? '',
    shipping_cost: toDecimal(payload.shippingCost) ?? '',
    shipping_label: payload.shippingLabel ?? '',
    notes: payload.notes ?? '',
    terms: payload.terms ?? '',
    po_number: payload.poNumber ?? '',
    payment_preference: payload.paymentPreference ?? '',
    credit_requested_amount: toDecimal(payload.creditRequestedAmount) ?? '0',
    delivery_quote_snapshot: payload.deliveryQuoteSnapshot ?? null,
    subtotal: String(totals.subtotal),
    total: String(totals.total),
    tax_total: String(totals.taxTotal),
    balance_due: String(totals.total),
  };

  const lineInserts = payload.lines.map((line, index) => ({
    product_template_id: line.productTemplateId ?? '',
    name: line.name,
    description: line.description ?? '',
    quantity: String(line.quantity),
    unit: line.unit ?? '',
    unit_price: String(line.unitPrice),
    discount_type: line.discountType,
    discount_value: toDecimal(line.discountValue) ?? '',
    total: String(totals.lineTotals[index].total),
    order_index: String(line.orderIndex ?? index),
    calculator_breakdown: line.calculatorBreakdown ?? null,
  }));

  const { data, error } = await supabase.rpc('update_invoice_with_items', {
    p_invoice_id: id,
    payload: {
      invoice: invoiceRecord,
      lines: lineInserts,
    },
  });

  if (error || !data?.invoice) {
    throw new AppError(`Failed to update invoice: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  const updatedInvoice = data.invoice as { number?: string };
  await insertInvoiceActivities(id, payload.clientId, 'INVOICE_UPDATED', `Invoice ${updatedInvoice?.number ?? id} updated`);

  logger.info({ scope: 'invoices.update', data: { id } });
  return getInvoice(id);
}

/**
 * Deletes an invoice and its line items
 * @param id - The invoice ID
 * @returns Deleted invoice metadata
 * @throws AppError if database delete fails
 */
export async function deleteInvoice(id: number) {
  const supabase = getServiceSupabase();

  // 1. Fetch invoice with relations to get file references
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select(`
      id,
      client_id,
      number,
      attachments(id, storage_key),
      order_files(id, storage_key)
    `)
    .eq('id', id)
    .single();

  if (fetchError || !invoice) {
    throw new NotFoundError('Invoice', id);
  }

  // 2. Delete files from storage BEFORE deleting DB records
  // Note: We delete storage first to prevent orphaned files, prioritizing cost management.
  // Storage failures are logged but don't block deletion (graceful degradation).
  const filesToDelete: Array<{ bucket: string; path: string }> = [];

  // Collect attachment files
  if (invoice.attachments && Array.isArray(invoice.attachments) && invoice.attachments.length > 0) {
    for (const att of invoice.attachments) {
      if (att.storage_key) {
        filesToDelete.push({
          bucket: 'attachments',
          path: att.storage_key
        });
      }
    }
  }

  // Collect order files
  if (invoice.order_files && Array.isArray(invoice.order_files) && invoice.order_files.length > 0) {
    for (const file of invoice.order_files) {
      if (file.storage_key) {
        filesToDelete.push({
          bucket: 'order-files',
          path: file.storage_key
        });
      }
    }
  }

  // Delete from storage
  for (const file of filesToDelete) {
    try {
      await deleteFromStorage(file.bucket, file.path);
      logger.info({
        scope: 'invoices.delete.storage',
        data: { invoiceId: id, bucket: file.bucket, path: file.path }
      });
    } catch (error) {
      logger.warn({
        scope: 'invoices.delete.storage',
        message: 'Failed to delete file from storage',
        error,
        data: { invoiceId: id, file }
      });
      // Continue - don't block invoice deletion
    }
  }

  // 3. Delete invoice (cascade will handle related records)
  const { data, error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .select('id, client_id, number')
    .single();

  if (error || !data) {
    throw new AppError(
      `Failed to delete invoice: ${error?.message ?? 'Unknown error'}`,
      'DATABASE_ERROR',
      500
    );
  }

  // 4. Log activity
  await insertInvoiceActivities(
    id,
    invoice.client_id,
    'INVOICE_DELETED',
    `Invoice ${invoice.number} deleted with ${filesToDelete.length} files cleaned up`
  );

  logger.info({
    scope: 'invoices.delete',
    data: { id, filesDeleted: filesToDelete.length }
  });

  return data;
}

/**
 * Adds a manual payment to an invoice and updates balance
 * @param invoiceId - The invoice ID
 * @param input - Payment details
 * @returns Created payment record
 * @throws AppError if database operations fail
 */
export async function addManualPayment(invoiceId: number, input: PaymentInput) {
  const supabase = getServiceSupabase();

  const paymentPayload = {
    amount: String(input.amount),
    method: input.method,
    reference: input.reference ?? '',
    processor: input.processor ?? '',
    processor_id: input.processorId ?? '',
    notes: input.notes ?? '',
    paid_at: input.paidAt ? new Date(input.paidAt).toISOString() : new Date().toISOString(),
  };

  const { data, error } = await supabase.rpc('add_invoice_payment', {
    payload: {
      invoice_id: invoiceId,
      payment: paymentPayload,
    },
  });

  if (error || !data?.payment || !data?.invoice) {
    throw new AppError(`Failed to record payment: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  const payment = data.payment as { id: number };
  const updatedInvoice = data.invoice as { id: number; client_id: number; number: string; status: string };

  await insertInvoiceActivities(
    invoiceId,
    updatedInvoice.client_id,
    'INVOICE_PAYMENT_ADDED',
    `Payment recorded for invoice ${updatedInvoice.number}`,
    { paymentId: payment.id },
  );
  logger.info({ scope: 'invoices.payment.add', data: { invoiceId, paymentId: payment.id } });

  if (updatedInvoice.status === InvoiceStatus.PAID) {
    const policy = await getJobCreationPolicy();
    if (policy === 'ON_PAYMENT') {
      await ensureJobForInvoice(invoiceId);
    }
  }

  // Send payment confirmation email to client
  const { data: client } = await supabase
    .from("clients")
    .select("email, business_name, contact_name")
    .eq("id", updatedInvoice.client_id)
    .single();

  if (client?.email) {
    const settings = await getSettings();
    await emailService.sendPaymentConfirmation(client.email, {
      clientName: client.business_name || client.contact_name,
      invoiceNumber: updatedInvoice.number,
      businessName: settings.businessName,
      amount: formatCurrency(input.amount, settings.defaultCurrency || 'AUD'),
      paymentMethod: input.method,
      customMessage: settings.emailTemplates?.payment_confirmation?.body || "Thank you for your payment.",
    });
  }

  return payment;
}

/**
 * Deletes a payment and recalculates invoice balance
 * @param paymentId - The payment ID
 * @returns Deleted payment record
 * @throws AppError if database operations fail
 */
export async function deletePayment(paymentId: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc('delete_invoice_payment', {
    p_payment_id: paymentId,
  });

  if (error || !data?.payment || !data?.invoice) {
    throw new AppError(`Failed to delete payment: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  const payment = data.payment as { id: number; invoice_id: number };
  const updatedInvoice = data.invoice as { id: number; client_id: number; number: string };

  await insertInvoiceActivities(
    updatedInvoice.id,
    updatedInvoice.client_id,
    'INVOICE_PAYMENT_DELETED',
    `Payment removed from invoice ${updatedInvoice.number}`,
    { paymentId },
  );
  return payment;
}

/**
 * Validates and uploads an attachment file to an invoice
 * @param invoiceId - The invoice ID
 * @param file - File object from multipart upload
 * @param userId - User ID performing the upload (for future authorization)
 * @returns Created attachment record
 * @throws Error if file validation fails
 * @throws AppError if upload or database operations fail
 * @throws NotFoundError if invoice not found
 */
export async function uploadInvoiceAttachment(
  invoiceId: number,
  file: File,
) {
  // Define allowed types and max size for invoice attachments
  const MAX_FILE_SIZE_MB = 200;
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/zip',
  ];

  // Validate file using validator utility
  validateInvoiceAttachment(file, MAX_FILE_SIZE_MB, ALLOWED_TYPES);

  // Convert File to Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Use existing attachment logic
  return addInvoiceAttachment(invoiceId, {
    name: file.name,
    type: file.type,
    buffer,
  });
}

/**
 * Uploads and attaches a file to an invoice
 * @param invoiceId - The invoice ID
 * @param file - File data to attach
 * @returns Created attachment record
 * @throws AppError if upload or database operations fail
 * @throws NotFoundError if invoice not found
 */
export async function addInvoiceAttachment(
  invoiceId: number,
  file: {
    name: string;
    type: string;
    buffer: Buffer;
  },
) {
  const supabase = getServiceSupabase();
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, client_id, number')
    .eq('id', invoiceId)
    .maybeSingle();
  if (invoiceError) {
    throw new AppError(`Failed to load invoice: ${invoiceError.message}`, 'DATABASE_ERROR', 500);
  }
  if (!invoice) {
    throw new NotFoundError('Invoice', invoiceId);
  }

  const safeName = file.name.replaceAll('\\', '/').split('/').pop()!.replace(/[^^\w.\-]+/g, '_');
  const storageKey = await uploadToStorage(invoiceId, safeName, file.buffer, file.type);

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      invoice_id: invoiceId,
      filename: safeName,
      storage_key: storageKey,
      filetype: file.type,
      size_bytes: file.buffer.length,
    })
    .select('*')
    .single();
  if (error || !data) {
    throw new AppError(`Failed to record attachment: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  await insertInvoiceActivities(invoiceId, invoice.client_id, 'INVOICE_ATTACHMENT_ADDED', `Attachment added to invoice ${invoice.number}`, { attachmentId: data.id });
  logger.info({ scope: 'invoices.attachments.add', data: { invoiceId, attachmentId: data.id } });
  return data;
}

/**
 * Removes an attachment from an invoice and deletes the file
 * @param attachmentId - The attachment ID
 * @returns Deleted attachment record
 * @throws NotFoundError if attachment not found
 */
export async function removeInvoiceAttachment(attachmentId: number) {
  const supabase = getServiceSupabase();
  const { data: attachment, error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId)
    .select('id, invoice_id, filename, storage_key')
    .single();
  if (error || !attachment) {
    throw new NotFoundError('Attachment', attachmentId);
  }

  await deleteInvoiceAttachment(attachment.storage_key);

  const { data: invoice } = await supabase
    .from('invoices')
    .select('client_id, number')
    .eq('id', attachment.invoice_id)
    .maybeSingle();

  if (invoice) {
    await insertInvoiceActivities(attachment.invoice_id, invoice.client_id, 'INVOICE_ATTACHMENT_DELETED', 'Attachment removed', { attachmentId });
  }

  logger.info({ scope: 'invoices.attachments.remove', data: { attachmentId } });
  return attachment;
}

/**
 * Retrieves a signed URL for accessing an invoice attachment
 * @param attachmentId - The attachment ID
 * @returns Signed URL and attachment metadata
 * @throws NotFoundError if attachment not found
 */
export async function readInvoiceAttachment(attachmentId: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('attachments')
    .select('id, invoice_id, filename, filetype, storage_key, size_bytes')
    .eq('id', attachmentId)
    .maybeSingle();
  if (error || !data) {
    throw new NotFoundError('Attachment', attachmentId);
  }

  const url = await getAttachmentSignedUrl(data.storage_key, 60);
  return { url, attachment: data };
}

/**
 * Marks an invoice as unpaid and recalculates balance
 * @param invoiceId - The invoice ID
 * @returns Updated invoice metadata
 * @throws AppError if database operations fail
 * @throws NotFoundError if invoice not found
 */
export async function markInvoiceUnpaid(invoiceId: number) {
  const supabase = getServiceSupabase();
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, client_id, number, total')
    .eq('id', invoiceId)
    .maybeSingle();
  if (invoiceError) {
    throw new AppError(`Failed to load invoice: ${invoiceError.message}`, 'DATABASE_ERROR', 500);
  }
  if (!invoice) {
    throw new NotFoundError('Invoice', invoiceId);
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId);
  if (paymentsError) {
    throw new AppError(`Failed to load payments: ${paymentsError.message}`, 'DATABASE_ERROR', 500);
  }

  const paidAmount = (payments ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const total = Number(invoice.total ?? 0);
  const balanceDue = Math.max(total - paidAmount, 0);

  const { data: updated, error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'PENDING',
      balance_due: String(balanceDue),
      paid_at: null,
    })
    .eq('id', invoiceId)
    .select('id, client_id, number')
    .single();

  if (updateError || !updated) {
    throw new AppError(`Failed to mark unpaid: ${updateError?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  await insertInvoiceActivities(invoiceId, updated.client_id, 'INVOICE_MARKED_UNPAID', `Invoice ${updated.number} marked unpaid`);
  return updated;
}

/**
 * Marks an invoice as paid, optionally recording a payment
 * @param invoiceId - The invoice ID
 * @param options - Optional payment details
 * @returns Created payment record or null if marked paid without payment
 * @throws AppError if database operations fail
 * @throws BadRequestError if invoice already paid
 * @throws NotFoundError if invoice not found
 */
export async function markInvoicePaid(invoiceId: number, options?: {
  method?: string;
  amount?: number;
  reference?: string;
  processor?: string;
  processorId?: string;
  note?: string;
  paidAt?: Date;
}) {
  const supabase = getServiceSupabase();

  // Validate invoice state before marking paid
  const { data: currentInvoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .single();

  if (!currentInvoice) {
    throw new NotFoundError('Invoice', invoiceId);
  }

  if (currentInvoice.status === 'PAID') {
    throw new BadRequestError('Invoice is already paid');
  }

  const amount = options?.amount ?? 0;
  if (amount > 0) {
    return addManualPayment(invoiceId, {
      amount,
      method: (options?.method ?? "OTHER") as "STRIPE" | "BANK_TRANSFER" | "CASH" | "OTHER",
      reference: options?.reference ?? '',
      processor: options?.processor ?? '',
      processorId: options?.processorId ?? '',
      notes: options?.note ?? '',
      paidAt: options?.paidAt?.toISOString(),
    });
  }

  const paidAt = options?.paidAt ?? new Date();
  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({
      status: 'PAID',
      balance_due: '0',
      paid_at: paidAt.toISOString(),
    })
    .eq('id', invoiceId)
    .select('id, client_id, number')
    .single();
  if (error || !invoice) {
    throw new AppError(`Failed to mark invoice paid: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }
  await insertInvoiceActivities(invoiceId, invoice.client_id, 'INVOICE_MARKED_PAID', `Invoice ${invoice.number} marked as paid`, {
    method: options?.method ?? 'OTHER',
    amount: 0,
  });

  // Send payment confirmation email to client
  const { data: client } = await supabase
    .from("clients")
    .select("email, business_name, contact_name")
    .eq("id", invoice.client_id)
    .single();

  if (client?.email) {
    const settings = await getSettings();
    await emailService.sendPaymentConfirmation(client.email, {
      clientName: client.business_name || client.contact_name,
      invoiceNumber: invoice.number,
      businessName: settings.businessName,
      amount: formatCurrency(0, settings.defaultCurrency || 'AUD'),
      paymentMethod: options?.method || 'OTHER',
      customMessage: settings.emailTemplates?.payment_confirmation?.body || "Thank you for your payment.",
    });
  }

  logger.info({ scope: 'invoices.markPaid', data: { invoiceId, amount: 0 } });
  return null;
}

/**
 * Writes off an invoice balance with optional reason
 * @param id - The invoice ID
 * @param reason - Optional write-off reason
 * @returns Updated invoice metadata
 * @throws AppError if database update fails
 * @throws BadRequestError if invoice already paid
 * @throws NotFoundError if invoice not found
 */
export async function writeOffInvoice(id: number, reason?: string) {
  const supabase = getServiceSupabase();

  // Validate invoice state before writing off
  const { data: currentInvoice } = await supabase
    .from('invoices')
    .select('id, status, balance_due')
    .eq('id', id)
    .single();

  if (!currentInvoice) {
    throw new NotFoundError('Invoice', id);
  }

  if (currentInvoice.status === 'PAID' && Number(currentInvoice.balance_due) === 0) {
    throw new BadRequestError('Invoice is already fully paid');
  }

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'PAID',
      balance_due: '0',
      write_off_reason: reason ?? null,
      written_off_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, client_id, number')
    .single();
  if (error || !data) {
    throw new AppError(`Failed to write off invoice: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }
  await insertInvoiceActivities(id, data.client_id, 'INVOICE_WRITTEN_OFF', `Invoice ${data.number} written off`, reason ? { reason } : undefined);
  return data;
}

/**
 * Voids an invoice with optional reason
 * @param id - The invoice ID
 * @param reason - Optional void reason
 * @returns Updated invoice metadata
 * @throws AppError if database update fails
 * @throws BadRequestError if invoice already paid
 * @throws NotFoundError if invoice not found
 */
export async function voidInvoice(id: number, reason?: string) {
  const supabase = getServiceSupabase();

  // Validate invoice state before voiding
  const { data: currentInvoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', id)
    .single();

  if (!currentInvoice) {
    throw new NotFoundError('Invoice', id);
  }

  if (currentInvoice.status === 'PAID') {
    throw new BadRequestError('Cannot void a paid invoice');
  }

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'PENDING',
      void_reason: reason ?? null,
      voided_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, client_id, number')
    .single();
  if (error || !data) {
    throw new AppError(`Failed to void invoice: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }
  await insertInvoiceActivities(id, data.client_id, 'INVOICE_VOIDED', `Invoice ${data.number} voided`, reason ? { reason } : undefined);
  return data;
}

/**
 * Reverts an invoice back to a quote
 * @param invoiceId - The invoice ID
 * @returns Created quote metadata
 * @throws AppError if database operations fail
 * @throws BadRequestError if invoice has payments or jobs
 * @throws NotFoundError if invoice not found
 */
export async function revertInvoiceToQuote(invoiceId: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `id, number, client_id, status, issue_date, due_date, tax_rate, discount_type, discount_value,
       shipping_cost, shipping_label, subtotal, tax_total, total, notes, terms, calculator_snapshot,
       invoice_items(id, product_template_id, name, description, quantity, unit, unit_price, discount_type, discount_value, total, order_index, calculator_breakdown),
       payments(id, amount),
       attachments(id, storage_key)`
    )
    .eq('id', invoiceId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load invoice: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError('Invoice', invoiceId);
  }

  const invoice = data as InvoiceRevertRow;

  if (invoice.status === 'PAID') {
    throw new BadRequestError('Paid invoices cannot be reverted to quotes');
  }

  const hasPayments = (invoice.payments ?? []).length > 0;
  if (hasPayments) {
    throw new BadRequestError('Invoice has payments recorded and cannot be reverted');
  }

  const { count: jobCount, error: jobError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId);
  if (jobError) {
    throw new AppError(`Failed to verify job linkage: ${jobError.message}`, 'DATABASE_ERROR', 500);
  }
  if ((jobCount ?? 0) > 0) {
    throw new BadRequestError('Invoice has associated jobs and cannot be reverted');
  }

  const quoteNumber = await nextDocumentNumber('quote');
  const nowIso = new Date().toISOString();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      number: quoteNumber,
      client_id: invoice.client_id,
      status: 'DRAFT',
      issue_date: invoice.issue_date ?? nowIso,
      expiry_date: invoice.due_date,
      tax_rate: invoice.tax_rate,
      discount_type: invoice.discount_type,
      discount_value: invoice.discount_value,
      shipping_cost: invoice.shipping_cost,
      shipping_label: invoice.shipping_label,
      subtotal: invoice.subtotal,
      tax_total: invoice.tax_total,
      total: invoice.total,
      notes: invoice.notes,
      terms: invoice.terms,
      calculator_snapshot: invoice.calculator_snapshot,
      source_data: { revertedFromInvoice: invoice.id },
      converted_invoice_id: invoice.id,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id, number')
    .single();

  if (quoteError || !quote) {
    throw new AppError(`Failed to create quote: ${quoteError?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  const quoteItems = (invoice.invoice_items ?? []).map((item, index) => ({
    quote_id: quote.id,
    product_template_id: item.product_template_id,
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

  if (quoteItems.length > 0) {
    const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems);
    if (itemsError) {
      await supabase.from('quotes').delete().eq('id', quote.id);
      throw new AppError(`Failed to copy invoice lines to quote: ${itemsError.message}`, 'DATABASE_ERROR', 500);
    }
  }

  await insertInvoiceActivities(invoice.id, invoice.client_id, 'INVOICE_REVERTED_TO_QUOTE', `Invoice ${invoice.number} reverted to quote ${quote.number}`, {
    quoteId: quote.id,
  });

  const { error: quoteActivityError } = await supabase.from('activity_logs').insert({
    client_id: invoice.client_id,
    quote_id: quote.id,
    action: 'QUOTE_RESTORED_FROM_INVOICE',
    message: `Quote ${quote.number} restored from invoice ${invoice.number}`,
    metadata: { invoiceId: invoice.id },
  });
  if (quoteActivityError) {
    logger.warn({
      scope: 'invoices.revert.activity',
      message: 'Failed to record quote activity during revert',
      error: quoteActivityError,
    });
  }

  const attachments = invoice.attachments ?? [];
  for (const attachment of attachments) {
    if (!attachment?.storage_key) {
      continue;
    }
    try {
      await deleteInvoiceAttachment(attachment.storage_key);
    } catch (storageError) {
      logger.warn({
        scope: 'invoices.revert.cleanup',
        message: 'Failed to remove attachment from storage; manual cleanup required',
        data: { attachmentId: attachment.id },
        error: storageError,
      });
    }
  }

  const { error: deleteError } = await supabase.from('invoices').delete().eq('id', invoiceId);
  if (deleteError) {
    await supabase.from('quotes').delete().eq('id', quote.id);
    throw new AppError(`Failed to delete invoice during revert: ${deleteError.message}`, 'DATABASE_ERROR', 500);
  }

  logger.info({ scope: 'invoices.revert', data: { invoiceId, quoteId: quote.id } });
  return quote;
}

/**
 * List invoices for a specific client (client portal view)
 * @param clientId - The client ID
 * @param options - Optional pagination options
 */
export async function listClientInvoices(
  clientId: number,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<import('@/lib/types/invoices').ClientInvoiceDTO[]> {
  const supabase = getServiceSupabase();

  const limit = options?.limit && Number.isFinite(options.limit) && options.limit > 0
    ? options.limit
    : 50;
  const offset = options?.offset && Number.isFinite(options.offset) && options.offset >= 0
    ? options.offset
    : 0;

  const { data, error } = await supabase
    .from('invoices')
    .select('id, number, status, total, issue_date, balance_due, stripe_checkout_url, discount_type, discount_value')
    .eq('client_id', clientId)
    .order('issue_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new AppError(
      `Failed to load client invoices: ${error.message}`,
      'CLIENT_INVOICE_ERROR',
      500
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    total: decimalToNumber(row.total),
    issueDate: row.issue_date,
    balanceDue: decimalToNumber(row.balance_due),
    stripeCheckoutUrl: row.stripe_checkout_url,
    discountType: row.discount_type ?? 'NONE',
    discountValue: row.discount_value ? Number(row.discount_value) : 0,
  }));
}

/**
 * Get activity logs for a specific invoice
 * @param invoiceId - The invoice ID
 * @param options - Optional pagination options
 */
export async function getInvoiceActivity(
  invoiceId: number,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<import('@/lib/types/invoices').ActivityDTO[]> {
  const supabase = getServiceSupabase();

  const limit = options?.limit && Number.isFinite(options.limit) && options.limit > 0
    ? options.limit
    : 50;
  const offset = options?.offset && Number.isFinite(options.offset) && options.offset >= 0
    ? options.offset
    : 0;

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, message, created_at')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new AppError(
      `Failed to load invoice activity: ${error.message}`,
      'ACTIVITY_LOAD_ERROR',
      500
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    message: row.message,
    createdAt: row.created_at,
  }));
}
