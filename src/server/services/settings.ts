import { logger } from '@/lib/logger';
import {
  type SettingsInput,
  shippingRegionSchema,
  paymentTermSchema,
  DEFAULT_PAYMENT_TERMS,
  jobCreationPolicyValues,
} from '@/lib/schemas/settings';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { AppError } from '@/lib/errors';

const DEFAULT_SHIPPING_REGIONS: SettingsInput['shippingRegions'] = [
  {
    code: 'sydney_metro',
    label: 'Sydney Metro',
    states: ['NSW'],
    baseAmount: 12.5,
    remoteSurcharge: 0,
  },
  {
    code: 'regional',
    label: 'Regional Australia',
    states: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'NT', 'TAS', 'ACT'],
    baseAmount: 25,
    remoteSurcharge: 0,
  },
  {
    code: 'remote',
    label: 'Remote & Islands',
    states: ['TAS', 'WA', 'NT'],
    baseAmount: 45,
    remoteSurcharge: 15,
  },
];

type SettingsRow = {
  id: number;
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  abn: string | null;
  tax_rate: string | null;
  numbering_quote_prefix: string;
  numbering_invoice_prefix: string;
  default_payment_terms: string | null;
  bank_details: string | null;
  job_creation_policy: string;
  default_currency: string | null;
  shipping_regions: unknown;
  default_shipping_region: string | null;
  payment_terms: unknown;
  calculator_config: unknown;
  auto_detach_job_on_complete: boolean | null;
  auto_archive_completed_jobs_after_days: number | null;
  prevent_assign_to_offline: boolean | null;
  prevent_assign_to_maintenance: boolean | null;
  max_active_printing_per_printer: number | null;
  overdue_days: number | null;
  reminder_cadence_days: number | null;
  enable_email_send: boolean | null;
  email_templates: unknown;
  email_from_address: string | null;
  created_at: string;
  updated_at: string;
};

function parseShippingRegions(payload: unknown): SettingsInput['shippingRegions'] {
  const list = Array.isArray(payload) ? payload : [];
  const parsed = list
    .map((item) => {
      const result = shippingRegionSchema.safeParse(item);
      if (!result.success) {
        logger.warn({
          scope: 'settings.shipping-regions.parse',
          message: 'Invalid shipping region encountered; skipping',
          error: result.error,
        });
        return null;
      }
      return result.data;
    })
    .filter((item): item is SettingsInput['shippingRegions'][number] => item !== null);
  return parsed.length > 0 ? parsed : DEFAULT_SHIPPING_REGIONS;
}

function parsePaymentTerms(payload: unknown): SettingsInput['paymentTerms'] {
  const list = Array.isArray(payload) ? payload : [];
  const parsed = list
    .map((item) => {
      const result = paymentTermSchema.safeParse(item);
      if (!result.success) {
        logger.warn({
          scope: 'settings.payment-terms.parse',
          message: 'Invalid payment term encountered; skipping',
          error: result.error,
        });
        return null;
      }
      return result.data;
    })
    .filter((item): item is SettingsInput['paymentTerms'][number] => item !== null);
  return parsed.length > 0 ? parsed : DEFAULT_PAYMENT_TERMS.map((term) => ({ ...term }));
}

type SerializedSettings = SettingsInput & { createdAt: Date; updatedAt: Date };

function serializeSettings(row: SettingsRow | null): SerializedSettings | null {
  if (!row) return null;

  const shippingRegions = parseShippingRegions(row.shipping_regions);
  const paymentTerms = parsePaymentTerms(row.payment_terms);
  const defaultPaymentTerms = row.default_payment_terms && paymentTerms.some((term) => term.code === row.default_payment_terms)
    ? row.default_payment_terms
    : DEFAULT_PAYMENT_TERMS[0].code;

  // Calculator config is already validated when written to DB at API boundary
  const calculator = (row.calculator_config ?? {}) as SettingsInput['calculatorConfig'];

  return {
    businessName: row.business_name,
    businessEmail: row.business_email ?? '',
    businessPhone: row.business_phone ?? '',
    businessAddress: row.business_address ?? '',
    abn: row.abn ?? '',
    taxRate: row.tax_rate ? Number(row.tax_rate) : undefined,
    numberingQuotePrefix: row.numbering_quote_prefix,
    numberingInvoicePrefix: row.numbering_invoice_prefix,
    defaultPaymentTerms,
    bankDetails: row.bank_details ?? '',
    jobCreationPolicy: row.job_creation_policy as (typeof jobCreationPolicyValues)[number],
    shippingRegions,
    defaultShippingRegion:
      row.default_shipping_region && shippingRegions.some((region) => region.code === row.default_shipping_region)
        ? row.default_shipping_region
        : shippingRegions[0]?.code ?? 'sydney_metro',
    paymentTerms,
    calculatorConfig: calculator,
    defaultCurrency: row.default_currency ?? 'AUD',
    autoDetachJobOnComplete: row.auto_detach_job_on_complete ?? true,
    autoArchiveCompletedJobsAfterDays: row.auto_archive_completed_jobs_after_days ?? 7,
    preventAssignToOffline: row.prevent_assign_to_offline ?? true,
    preventAssignToMaintenance: row.prevent_assign_to_maintenance ?? true,
    maxActivePrintingPerPrinter: row.max_active_printing_per_printer ?? 1,
    overdueDays: row.overdue_days ?? 0,
    reminderCadenceDays: row.reminder_cadence_days ?? 7,
    enableEmailSend: row.enable_email_send ?? false,
    emailTemplates: row.email_templates as SettingsInput['emailTemplates'] ?? undefined,
    emailFromAddress: row.email_from_address ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function ensureSettingsRow(): Promise<SettingsRow> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    throw new AppError(`Failed to read settings: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (data) {
    return data as SettingsRow;
  }
  const { data: inserted, error: insertError } = await supabase
    .from('settings')
    .insert({ id: 1, business_name: '' })
    .select('*')
    .single();
  if (insertError || !inserted) {
    throw new AppError(`Failed to initialize settings: ${insertError?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }
  return inserted as SettingsRow;
}

export type PaymentTermOption = SettingsInput['paymentTerms'][number];

/**
 * Get system settings with all configuration options
 * @returns Serialized settings with all configuration, or null if not found
 */
export async function getSettings(): Promise<SerializedSettings | null> {
  const row = await ensureSettingsRow();
  return serializeSettings(row);
}

/**
 * Update system settings and number sequence updates
 * @param payload - Pre-validated settings update payload (validated at API boundary)
 * @returns Updated settings
 * @throws AppError if database operation fails
 */
export async function updateSettings(payload: SettingsInput): Promise<SerializedSettings | null> {
  const supabase = getServiceSupabase();

  const updatePayload = {
    business_name: payload.businessName,
    business_email: payload.businessEmail || null,
    business_phone: payload.businessPhone || null,
    business_address: payload.businessAddress || null,
    abn: payload.abn || null,
    tax_rate: payload.taxRate !== undefined ? String(payload.taxRate) : null,
    numbering_quote_prefix: payload.numberingQuotePrefix,
    numbering_invoice_prefix: payload.numberingInvoicePrefix,
    default_payment_terms: payload.defaultPaymentTerms.trim(),
    bank_details: payload.bankDetails || null,
    job_creation_policy: payload.jobCreationPolicy,
    default_currency: payload.defaultCurrency,
    shipping_regions: payload.shippingRegions,
    default_shipping_region: payload.defaultShippingRegion,
    payment_terms: payload.paymentTerms.map((term) => ({
      code: term.code.trim(),
      label: term.label.trim(),
      days: term.days,
    })),
    calculator_config: payload.calculatorConfig,
    auto_detach_job_on_complete: payload.autoDetachJobOnComplete,
    auto_archive_completed_jobs_after_days: payload.autoArchiveCompletedJobsAfterDays,
    prevent_assign_to_offline: payload.preventAssignToOffline,
    prevent_assign_to_maintenance: payload.preventAssignToMaintenance,
    max_active_printing_per_printer: payload.maxActivePrintingPerPrinter,
    overdue_days: payload.overdueDays,
    reminder_cadence_days: payload.reminderCadenceDays,
    enable_email_send: payload.enableEmailSend,
    email_templates: payload.emailTemplates || null,
    email_from_address: payload.emailFromAddress || null,
  };

  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...updatePayload })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(`Failed to update settings: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
  }

  const sequenceUpdates = [
    { kind: 'quote', prefix: payload.numberingQuotePrefix },
    { kind: 'invoice', prefix: payload.numberingInvoicePrefix },
  ].map((entry) => ({ ...entry, current: 1 }));

  const { error: sequenceError } = await supabase
    .from('number_sequences')
    .upsert(sequenceUpdates, { onConflict: 'kind' });

  if (sequenceError) {
    throw new AppError(`Failed to update number sequences: ${sequenceError.message}`, 'DATABASE_ERROR', 500);
  }

  await supabase.from('activity_logs').insert({
    action: 'SETTINGS_UPDATED',
    message: 'Settings updated',
    metadata: { sections: Object.keys(payload as Record<string, unknown>) },
  });

  logger.info({
    scope: 'settings.update',
    data: { jobCreationPolicy: payload.jobCreationPolicy },
  });

  return serializeSettings(data as SettingsRow);
}

/**
 * Resolve available payment terms options from settings
 * @returns Payment terms options and default selection
 * @throws AppError if unable to load payment terms from settings
 */
export async function resolvePaymentTermsOptions(
  _unused?: unknown,
): Promise<{
  paymentTerms: PaymentTermOption[];
  defaultPaymentTerms: string;
}> {
  void _unused;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('settings')
    .select('payment_terms, default_payment_terms')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load payment terms: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  const paymentTerms = parsePaymentTerms(data?.payment_terms);
  const defaultPaymentTerms = data?.default_payment_terms && paymentTerms.some((term) => term.code === data.default_payment_terms)
    ? data.default_payment_terms
    : DEFAULT_PAYMENT_TERMS[0].code;

  return { paymentTerms, defaultPaymentTerms };
}
