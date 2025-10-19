import { logger } from '@/lib/logger';
import {
  settingsInputSchema,
  type SettingsInput,
  calculatorConfigSchema,
  shippingRegionSchema,
  paymentTermSchema,
  DEFAULT_PAYMENT_TERMS,
  jobCreationPolicyValues,
} from '@/lib/schemas/settings';
import { getServiceSupabase } from '@/server/supabase/service-client';

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
          scope: 'settings.shippingRegions.parse',
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
          scope: 'settings.paymentTerms.parse',
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

  const calculator = calculatorConfigSchema.parse(row.calculator_config ?? {});

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
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function ensureSettingsRow(): Promise<SettingsRow> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    throw new Error(`Failed to read settings: ${error.message}`);
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
    throw new Error(`Failed to initialize settings: ${insertError?.message ?? 'Unknown error'}`);
  }
  return inserted as SettingsRow;
}

export type PaymentTermOption = SettingsInput['paymentTerms'][number];

export async function getSettings(): Promise<SerializedSettings | null> {
  const row = await ensureSettingsRow();
  return serializeSettings(row);
}

export async function updateSettings(payload: unknown): Promise<SerializedSettings | null> {
  const parsed = settingsInputSchema.parse(payload);
  const supabase = getServiceSupabase();

  const updatePayload = {
    business_name: parsed.businessName,
    business_email: parsed.businessEmail || null,
    business_phone: parsed.businessPhone || null,
    business_address: parsed.businessAddress || null,
    abn: parsed.abn || null,
    tax_rate: parsed.taxRate !== undefined ? String(parsed.taxRate) : null,
    numbering_quote_prefix: parsed.numberingQuotePrefix,
    numbering_invoice_prefix: parsed.numberingInvoicePrefix,
    default_payment_terms: parsed.defaultPaymentTerms.trim(),
    bank_details: parsed.bankDetails || null,
    job_creation_policy: parsed.jobCreationPolicy,
    default_currency: parsed.defaultCurrency,
    shipping_regions: parsed.shippingRegions,
    default_shipping_region: parsed.defaultShippingRegion,
    payment_terms: parsed.paymentTerms.map((term) => ({
      code: term.code.trim(),
      label: term.label.trim(),
      days: term.days,
    })),
    calculator_config: parsed.calculatorConfig,
    auto_detach_job_on_complete: parsed.autoDetachJobOnComplete,
    auto_archive_completed_jobs_after_days: parsed.autoArchiveCompletedJobsAfterDays,
    prevent_assign_to_offline: parsed.preventAssignToOffline,
    prevent_assign_to_maintenance: parsed.preventAssignToMaintenance,
    max_active_printing_per_printer: parsed.maxActivePrintingPerPrinter,
    overdue_days: parsed.overdueDays,
    reminder_cadence_days: parsed.reminderCadenceDays,
    enable_email_send: parsed.enableEmailSend,
  };

  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...updatePayload })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update settings: ${error?.message ?? 'Unknown error'}`);
  }

  const sequenceUpdates = [
    { kind: 'quote', prefix: parsed.numberingQuotePrefix },
    { kind: 'invoice', prefix: parsed.numberingInvoicePrefix },
  ].map((entry) => ({ ...entry, current: 1 }));

  const { error: sequenceError } = await supabase
    .from('number_sequences')
    .upsert(sequenceUpdates, { onConflict: 'kind' });

  if (sequenceError) {
    throw new Error(`Failed to update number sequences: ${sequenceError.message}`);
  }

  await supabase.from('activity_logs').insert({
    action: 'SETTINGS_UPDATED',
    message: 'Settings updated',
    metadata: { sections: Object.keys(payload as Record<string, unknown>) },
  });

  logger.info({
    scope: 'settings.update',
    data: { jobCreationPolicy: parsed.jobCreationPolicy },
  });

  return serializeSettings(data as SettingsRow);
}

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
    throw new Error(`Failed to load payment terms: ${error.message}`);
  }

  const paymentTerms = parsePaymentTerms(data?.payment_terms);
  const defaultPaymentTerms = data?.default_payment_terms && paymentTerms.some((term) => term.code === data.default_payment_terms)
    ? data.default_payment_terms
    : DEFAULT_PAYMENT_TERMS[0].code;

  return { paymentTerms, defaultPaymentTerms };
}
