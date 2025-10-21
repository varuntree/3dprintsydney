import { addDays } from 'date-fns';
import { logger } from '@/lib/logger';
import { DiscountType, InvoiceStatus, JobStatus, PaymentMethod } from '@/lib/constants/enums';
import {
  calculateLineTotal,
  calculateDocumentTotals,
} from '@/lib/calculations';
import {
  invoiceInputSchema,
  paymentInputSchema,
  type InvoiceInput,
} from '@/lib/schemas/invoices';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { nextDocumentNumber } from '@/server/services/numbering';
import { getJobCreationPolicy, ensureJobForInvoice } from '@/server/services/jobs';
import { resolvePaymentTermsOptions } from '@/server/services/settings';
import { uploadInvoiceAttachment, deleteInvoiceAttachment, getAttachmentSignedUrl } from '@/server/storage/supabase';
import { AppError, NotFoundError, BadRequestError } from '@/lib/errors';
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
  clients?: { id: number; name: string; payment_terms?: string | null } | Array<{ id: number; name: string; payment_terms?: string | null }> | null;
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
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
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
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  return {
    id: row.id,
    number: row.number,
    status: (row.status ?? 'PENDING') as InvoiceStatus,
    total: Number(row.total ?? 0),
    balanceDue: Number(row.balance_due ?? 0),
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
    client: {
      id: row.client_id,
      name: client?.name ?? '',
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
    lines: (row.items ?? []).map((item) => ({
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
      calculatorBreakdown: item.calculator_breakdown as Record<string, unknown> | null,
    })),
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

export async function createInvoice(payload: unknown) {
  const parsed = invoiceInputSchema.parse(payload);
  const supabase = getServiceSupabase();
  const totals = computeTotals(parsed);
  const issueDate = parsed.issueDate ? new Date(parsed.issueDate) : new Date();
  const paymentTerm = await resolveClientPaymentTerm(parsed.clientId);
  const dueDate = deriveDueDate(issueDate, paymentTerm, parsed.dueDate ? new Date(parsed.dueDate) : null);
  const number = await nextDocumentNumber('invoice');

  const invoiceRecord = {
    number,
    client_id: parsed.clientId,
    status: InvoiceStatus.PENDING,
    issue_date: issueDate.toISOString(),
    due_date: dueDate?.toISOString() ?? '',
    tax_rate: toDecimal(parsed.taxRate) ?? '',
    discount_type: parsed.discountType,
    discount_value: toDecimal(parsed.discountValue) ?? '',
    shipping_cost: toDecimal(parsed.shippingCost) ?? '',
    shipping_label: parsed.shippingLabel ?? '',
    notes: parsed.notes ?? '',
    terms: parsed.terms ?? '',
    po_number: parsed.poNumber ?? '',
    subtotal: String(totals.subtotal),
    total: String(totals.total),
    tax_total: String(totals.taxTotal),
    balance_due: String(totals.total),
  };

  const lineInserts = parsed.lines.map((line, index) => ({
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

  await insertInvoiceActivities(invoiceId, parsed.clientId, 'INVOICE_CREATED', `Invoice ${number} created`);

  const policy = await getJobCreationPolicy();
  if (policy === 'ON_INVOICE') {
    await ensureJobForInvoice(invoiceId);
  }

  logger.info({ scope: 'invoices.create', data: { id: invoiceId } });

  return getInvoice(invoiceId);
}

export async function updateInvoice(id: number, payload: unknown) {
  const parsed = invoiceInputSchema.parse(payload);
  const supabase = getServiceSupabase();
  const totals = computeTotals(parsed);
  const issueDate = parsed.issueDate ? new Date(parsed.issueDate) : new Date();
  const paymentTerm = await resolveClientPaymentTerm(parsed.clientId);
  const dueDate = deriveDueDate(issueDate, paymentTerm, parsed.dueDate ? new Date(parsed.dueDate) : null);

  const invoiceRecord = {
    client_id: parsed.clientId,
    issue_date: issueDate.toISOString(),
    due_date: dueDate?.toISOString() ?? '',
    tax_rate: toDecimal(parsed.taxRate) ?? '',
    discount_type: parsed.discountType,
    discount_value: toDecimal(parsed.discountValue) ?? '',
    shipping_cost: toDecimal(parsed.shippingCost) ?? '',
    shipping_label: parsed.shippingLabel ?? '',
    notes: parsed.notes ?? '',
    terms: parsed.terms ?? '',
    po_number: parsed.poNumber ?? '',
    subtotal: String(totals.subtotal),
    total: String(totals.total),
    tax_total: String(totals.taxTotal),
    balance_due: String(totals.total),
  };

  const lineInserts = parsed.lines.map((line, index) => ({
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
  await insertInvoiceActivities(id, parsed.clientId, 'INVOICE_UPDATED', `Invoice ${updatedInvoice?.number ?? id} updated`);

  logger.info({ scope: 'invoices.update', data: { id } });
  return getInvoice(id);
}

export async function deleteInvoice(id: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .select('id, client_id, number')
    .single();

  if (error || !data) {
    throw new AppError(`Failed to delete invoice: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  await insertInvoiceActivities(id, data.client_id, 'INVOICE_DELETED', `Invoice ${data.number} deleted`);
  logger.info({ scope: 'invoices.delete', data: { id } });
  return data;
}

export async function addManualPayment(invoiceId: number, payload: unknown) {
  const parsed = paymentInputSchema.parse(payload);
  const supabase = getServiceSupabase();

  const paymentPayload = {
    amount: String(parsed.amount),
    method: parsed.method,
    reference: parsed.reference ?? '',
    processor: parsed.processor ?? '',
    processor_id: parsed.processorId ?? '',
    notes: parsed.notes ?? '',
    paid_at: parsed.paidAt ? new Date(parsed.paidAt).toISOString() : new Date().toISOString(),
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

  return payment;
}

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
  const storageKey = await uploadInvoiceAttachment(invoiceId, safeName, file.buffer, file.type);

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
      method: options?.method ?? PaymentMethod.OTHER,
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
  logger.info({ scope: 'invoices.markPaid', data: { invoiceId, amount: 0 } });
  return null;
}

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
