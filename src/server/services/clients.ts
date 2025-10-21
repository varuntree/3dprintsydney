import { logger } from '@/lib/logger';
import type { ClientInput, ClientNoteInput } from '@/lib/schemas/clients';
import { DEFAULT_PAYMENT_TERMS } from '@/lib/schemas/settings';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { AppError, NotFoundError, BadRequestError } from '@/lib/errors';
import type { ClientSummaryDTO, ClientDetailDTO, ClientFilters } from '@/lib/types/clients';

/**
 * Normalize and validate payment terms code against system settings
 * @param term - Payment terms code to validate
 * @returns Validated payment terms code or null if empty
 * @throws BadRequestError if payment terms code is invalid
 * @throws AppError if unable to load settings
 */
async function normalizePaymentTermsCode(term: string | null | undefined): Promise<string | null> {
  const trimmed = term?.trim();
  if (!trimmed) {
    return null;
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('settings')
    .select('payment_terms, default_payment_terms')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new AppError(`Unable to resolve payment terms: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const paymentTerms = Array.isArray(data?.payment_terms) ? data?.payment_terms : DEFAULT_PAYMENT_TERMS;
  const isValid = paymentTerms.some((option) => option.code === trimmed);
  if (!isValid) {
    throw new BadRequestError('Invalid payment terms selection');
  }

  return trimmed;
}

/**
 * Insert an activity log entry
 * @param entry - Activity log entry details
 * @throws AppError if unable to insert activity log
 */
async function insertActivity(entry: {
  clientId?: number | null;
  quoteId?: number | null;
  invoiceId?: number | null;
  jobId?: number | null;
  printerId?: number | null;
  action: string;
  message: string;
  metadata?: Record<string, unknown> | null;
}) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('activity_logs').insert({
    client_id: entry.clientId ?? null,
    quote_id: entry.quoteId ?? null,
    invoice_id: entry.invoiceId ?? null,
    job_id: entry.jobId ?? null,
    printer_id: entry.printerId ?? null,
    action: entry.action,
    message: entry.message,
    metadata: entry.metadata ?? null,
  });
  if (error) {
    throw new AppError(`Failed to record activity: ${error.message}`, 'DATABASE_ERROR', 500);
  }
}

/**
 * Parse and normalize text input, converting empty strings to null
 * @param value - Text value to parse
 * @returns Trimmed text or null if empty
 */
function parseNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

type ClientRow = {
  id: number;
  name: string;
  company: string | null;
  abn: string | null;
  email: string | null;
  phone: string | null;
  address: { raw?: string } | null;
  tags: string[] | null;
  payment_terms: string | null;
  notes: string | null;
  notify_on_job_status: boolean;
  created_at: string;
  updated_at: string;
  invoices?: Array<{ balance_due: number | null; status: string; total?: number | null }> | null;
  quotes?: Array<{ id: number }> | null;
};

/**
 * Map database row to client summary DTO
 * @param row - Client database row
 * @returns Client summary DTO with calculated outstanding balance
 */
function mapClientSummary(row: ClientRow): ClientSummaryDTO {
  const invoices = row.invoices ?? [];
  const outstanding = invoices.reduce((sum, invoice) => {
    if (invoice.status === 'PAID') {
      return sum;
    }
    return sum + Number(invoice.balance_due ?? 0);
  }, 0);

  return {
    id: row.id,
    name: row.name,
    company: row.company ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    paymentTerms: row.payment_terms,
    notifyOnJobStatus: row.notify_on_job_status,
    outstandingBalance: outstanding,
    totalInvoices: invoices.length,
    totalQuotes: (row.quotes ?? []).length,
    createdAt: new Date(row.created_at),
  };
}

/**
 * List all clients with optional filtering, sorting, and pagination
 * @param options - Optional filters for search, sorting, and pagination
 * @returns Array of client summary DTOs with outstanding balances
 * @throws AppError if database query fails
 */
export async function listClients(options?: ClientFilters): Promise<ClientSummaryDTO[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from('clients')
    .select(
      `id, name, company, email, phone, payment_terms, notify_on_job_status, created_at,
       invoices(balance_due,status), quotes(id)`
    );

  if (options?.q) {
    const term = options.q.trim();
    query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%`);
  }

  const sortColumn = options?.sort === 'createdAt' ? 'created_at' : 'name';
  const ascending = (options?.order ?? 'asc') !== 'desc';
  query = query.order(sortColumn, { ascending, nullsFirst: !ascending });

  if (typeof options?.limit === 'number') {
    const limit = Math.max(0, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + Math.max(limit - 1, 0));
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list clients: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return (data ?? []).map((row) => mapClientSummary(row as ClientRow));
}

/**
 * Create a new client
 * @param input - Client creation input (already validated)
 * @returns Created client data
 * @throws BadRequestError if payment terms are invalid
 * @throws AppError if database operation fails
 */
export async function createClient(input: ClientInput) {
  const supabase = getServiceSupabase();

  const paymentTermsCode = await normalizePaymentTermsCode(input.paymentTerms ?? null);

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: input.name,
      company: parseNullableText(input.company),
      abn: parseNullableText(input.abn),
      email: parseNullableText(input.email),
      phone: parseNullableText(input.phone),
      address: input.address ? { raw: input.address } : null,
      payment_terms: paymentTermsCode,
      notify_on_job_status: input.notifyOnJobStatus ?? false,
      notes: parseNullableText(input.notes),
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError(`Failed to create client: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity({
    clientId: data.id,
    action: 'CLIENT_CREATED',
    message: `Client ${data.name} created`,
  });

  logger.info({ scope: 'clients.create', data: { id: data.id } });

  return {
    ...data,
    address: input.address ? { raw: input.address } : null,
  };
}

/**
 * Update an existing client
 * @param id - Client ID
 * @param input - Client update input (already validated)
 * @returns Updated client data
 * @throws BadRequestError if payment terms are invalid
 * @throws AppError if database operation fails
 */
export async function updateClient(id: number, input: ClientInput) {
  const supabase = getServiceSupabase();

  const paymentTermsCode = await normalizePaymentTermsCode(input.paymentTerms ?? null);

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: input.name,
      company: parseNullableText(input.company),
      abn: parseNullableText(input.abn),
      email: parseNullableText(input.email),
      phone: parseNullableText(input.phone),
      address: input.address ? { raw: input.address } : null,
      payment_terms: paymentTermsCode,
      notify_on_job_status: input.notifyOnJobStatus ?? false,
      notes: parseNullableText(input.notes),
      tags: input.tags ?? [],
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(`Failed to update client: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity({
    clientId: id,
    action: 'CLIENT_UPDATED',
    message: `Client ${data.name} updated`,
  });

  logger.info({ scope: 'clients.update', data: { id } });

  return {
    ...data,
    address: input.address ? { raw: input.address } : null,
  };
}

/**
 * Delete a client and record activity
 * @param id - Client ID to delete
 * @returns Deleted client data (id and name)
 * @throws AppError if database operation fails
 */
export async function deleteClient(id: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .select('id, name')
    .single();

  if (error || !data) {
    throw new AppError(`Failed to delete client: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity({
    clientId: id,
    action: 'CLIENT_DELETED',
    message: `Client ${data.name} deleted`,
  });

  logger.info({ scope: 'clients.delete', data: { id } });

  return data;
}

/**
 * Get client's job status notification preference
 * @param clientId - Client ID
 * @returns Boolean indicating if client wants job status notifications
 * @throws NotFoundError if client doesn't exist
 * @throws AppError if database operation fails
 */
export async function getClientNotificationPreference(clientId: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('clients')
    .select('notify_on_job_status')
    .eq('id', clientId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load client preference: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError('Client', clientId);
  }

  return Boolean(data.notify_on_job_status);
}

/**
 * Update client's job status notification preference
 * @param clientId - Client ID
 * @param notifyOnJobStatus - New notification preference value
 * @returns Updated preference value
 * @throws AppError if database operation fails
 */
export async function updateClientNotificationPreference(
  clientId: number,
  notifyOnJobStatus: boolean,
) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('clients')
    .update({ notify_on_job_status: notifyOnJobStatus })
    .eq('id', clientId)
    .select('id, name, notify_on_job_status')
    .single();

  if (error || !data) {
    throw new AppError(`Failed to update client preference: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity({
    clientId,
    action: 'CLIENT_PREF_UPDATED',
    message: `Client ${data.name} notification preference updated`,
    metadata: { notifyOnJobStatus },
  });

  logger.info({
    scope: 'clients.preference',
    data: { clientId, notifyOnJobStatus },
  });

  return Boolean(data.notify_on_job_status);
}

/**
 * Get comprehensive client details including invoices, quotes, jobs, and activity
 * @param id - Client ID
 * @returns Complete client details with related data and calculated totals
 * @throws NotFoundError if client doesn't exist
 * @throws AppError if database operation fails
 */
export async function getClientDetail(id: number): Promise<ClientDetailDTO> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('clients')
    .select(
      `id, name, company, email, phone, payment_terms, notify_on_job_status, abn, notes, tags, address, created_at, updated_at,
       invoices(id, number, status, total, balance_due, issue_date),
       quotes(id, number, status, total, issue_date),
       jobs(id, title, status, priority, created_at)`
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load client: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError('Client', id);
  }

  const invoices = (data.invoices ?? []).map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    total: Number(invoice.total ?? 0),
    balanceDue: Number(invoice.balance_due ?? 0),
    issueDate: new Date(invoice.issue_date ?? new Date().toISOString()),
  }));

  const quotes = (data.quotes ?? []).map((quote) => ({
    id: quote.id,
    number: quote.number,
    status: quote.status,
    total: Number(quote.total ?? 0),
    issueDate: new Date(quote.issue_date ?? new Date().toISOString()),
  }));

  const jobs = (data.jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    status: job.status,
    priority: job.priority,
    createdAt: new Date(job.created_at ?? new Date().toISOString()),
  }));

  const outstanding = invoices.reduce((sum, invoice) => {
    if (invoice.status === 'PAID') {
      return sum;
    }
    return sum + invoice.balanceDue;
  }, 0);

  const paid = invoices.reduce((sum, invoice) => {
    if (invoice.status !== 'PAID') {
      return sum;
    }
    return sum + invoice.total;
  }, 0);

  const openJobStatuses = new Set([
    'QUEUED',
    'PRE_PROCESSING',
    'IN_QUEUE',
    'PRINTING',
    'PAUSED',
    'PRINTING_COMPLETE',
    'POST_PROCESSING',
    'PACKAGING',
    'OUT_FOR_DELIVERY',
  ]);

  const queuedJobs = jobs.filter((job) => openJobStatuses.has(job.status)).length;

  const { data: activityRows, error: activityError } = await supabase
    .from('activity_logs')
    .select('id, action, message, created_at, invoice_id, quote_id, job_id')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (activityError) {
    throw new AppError(`Failed to load client activity: ${activityError.message}`, 'DATABASE_ERROR', 500);
  }

  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice.number]));
  const quoteMap = new Map(quotes.map((quote) => [quote.id, quote.number]));
  const jobMap = new Map(jobs.map((job) => [job.id, job.title]));

  const activity = (activityRows ?? []).map((entry) => {
    let context: string | undefined;
    if (entry.invoice_id && invoiceMap.has(entry.invoice_id)) {
      context = `Invoice ${invoiceMap.get(entry.invoice_id)}`;
    } else if (entry.quote_id && quoteMap.has(entry.quote_id)) {
      context = `Quote ${quoteMap.get(entry.quote_id)}`;
    } else if (entry.job_id && jobMap.has(entry.job_id)) {
      context = `Job ${jobMap.get(entry.job_id)}`;
    }
    return {
      id: entry.id,
      action: entry.action,
      message: entry.message,
      createdAt: new Date(entry.created_at ?? new Date().toISOString()),
      context,
    };
  });

  const { data: clientUserRow, error: clientUserError } = await supabase
    .from('users')
    .select('id, email, created_at')
    .eq('client_id', id)
    .eq('role', 'CLIENT')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (clientUserError) {
    throw new AppError(`Failed to load client user: ${clientUserError.message}`, 'DATABASE_ERROR', 500);
  }

  let clientUser: ClientDetailDTO['clientUser'] = null;
  if (clientUserRow) {
    const { count: messageCount, error: messageCountError } = await supabase
      .from('user_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', clientUserRow.id);
    if (messageCountError) {
      throw new AppError(`Failed to count client messages: ${messageCountError.message}`, 'DATABASE_ERROR', 500);
    }
    clientUser = {
      id: clientUserRow.id,
      email: clientUserRow.email,
      createdAt: new Date(clientUserRow.created_at ?? new Date().toISOString()),
      messageCount: messageCount ?? 0,
    };
  }

  return {
    client: {
      id: data.id,
      name: data.name,
      company: data.company ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      address: (data.address as { raw?: string } | null)?.raw ?? '',
      paymentTerms: data.payment_terms ?? '',
      notifyOnJobStatus: data.notify_on_job_status,
      abn: data.abn ?? null,
      notes: data.notes ?? '',
      tags: (data.tags as string[] | null) ?? [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    },
    invoices,
    quotes,
    jobs,
    activity,
    totals: {
      outstanding,
      paid,
      queuedJobs,
    },
    clientUser,
  };
}

/**
 * Add a note to client's activity log
 * @param id - Client ID
 * @param input - Note input (already validated)
 * @returns Created activity log entry
 * @throws AppError if database operation fails
 */
export async function addClientNote(id: number, input: ClientNoteInput) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      client_id: id,
      action: 'CLIENT_NOTE',
      message: input.body,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError(`Failed to add client note: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  logger.info({ scope: 'clients.note', data: { id } });

  return data;
}
