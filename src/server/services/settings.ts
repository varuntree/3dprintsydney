import { prisma } from "@/server/db/client";
import { JobCreationPolicy, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import {
  settingsInputSchema,
  type SettingsInput,
  calculatorConfigSchema,
  shippingOptionSchema,
  paymentTermSchema,
  DEFAULT_PAYMENT_TERMS,
} from "@/lib/schemas/settings";

function serializeSettings(
  settings: Awaited<ReturnType<typeof prisma.settings.findUnique>>,
) {
  if (!settings) {
    return null;
  }

  const shippingRaw = Array.isArray(settings.shippingOptions)
    ? settings.shippingOptions
    : [];
  const shippingOptions = shippingRaw
    .map((item) => {
      const parsed = shippingOptionSchema.safeParse(item);
      if (!parsed.success) {
        logger.warn({
          scope: "settings.shippingOptions.parse",
          message: "Invalid shipping option encountered; skipping",
          error: parsed.error,
        });
        return null;
      }
      return parsed.data;
    })
    .filter(
      (item): item is SettingsInput["shippingOptions"][number] => item !== null,
    );

  const paymentTermsRaw = Array.isArray(settings.paymentTerms)
    ? settings.paymentTerms
    : [];
  const paymentTerms = paymentTermsRaw
    .map((item) => {
      const parsed = paymentTermSchema.safeParse(item);
      if (!parsed.success) {
        logger.warn({
          scope: "settings.paymentTerms.parse",
          message: "Invalid payment term encountered; skipping",
          error: parsed.error,
        });
        return null;
      }
      return parsed.data;
    })
    .filter(
      (item): item is SettingsInput["paymentTerms"][number] => item !== null,
    );

  const resolvedPaymentTerms =
    paymentTerms.length > 0
      ? paymentTerms
      : DEFAULT_PAYMENT_TERMS.map((term) => ({ ...term }));

  const defaultPaymentTermCode =
    settings.defaultPaymentTerms &&
    resolvedPaymentTerms.some((term) => term.code === settings.defaultPaymentTerms)
      ? settings.defaultPaymentTerms
      : DEFAULT_PAYMENT_TERMS[0].code;

  const calculator = calculatorConfigSchema.parse(
    settings.calculatorConfig ?? {},
  );

  return {
    businessName: settings.businessName,
    businessEmail: settings.businessEmail ?? "",
    businessPhone: settings.businessPhone ?? "",
    businessAddress: settings.businessAddress ?? "",
    abn: settings.abn ?? "",
    taxRate: settings.taxRate ? Number(settings.taxRate) : undefined,
    numberingQuotePrefix: settings.numberingQuotePrefix,
    numberingInvoicePrefix: settings.numberingInvoicePrefix,
    defaultPaymentTerms: defaultPaymentTermCode,
    bankDetails: settings.bankDetails ?? "",
    jobCreationPolicy: settings.jobCreationPolicy,
    shippingOptions,
    paymentTerms: resolvedPaymentTerms,
    calculatorConfig: calculator,
    defaultCurrency: settings.defaultCurrency ?? "AUD",
    autoDetachJobOnComplete: settings.autoDetachJobOnComplete ?? true,
    autoArchiveCompletedJobsAfterDays:
      settings.autoArchiveCompletedJobsAfterDays ?? 7,
    preventAssignToOffline: settings.preventAssignToOffline ?? true,
    preventAssignToMaintenance: settings.preventAssignToMaintenance ?? true,
    maxActivePrintingPerPrinter: settings.maxActivePrintingPerPrinter ?? 1,
    overdueDays: settings.overdueDays ?? 0,
    reminderCadenceDays: settings.reminderCadenceDays ?? 7,
    enableEmailSend: settings.enableEmailSend ?? false,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  } as SettingsInput & { createdAt: Date; updatedAt: Date };
}

export type PaymentTermOption = SettingsInput["paymentTerms"][number];

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    await prisma.settings.create({ data: { id: 1, businessName: "" } });
    return getSettings();
  }
  return serializeSettings(settings);
}

export async function updateSettings(payload: unknown) {
  const parsed = settingsInputSchema.parse(payload);
  const shippingOptionsJson =
    parsed.shippingOptions as unknown as Prisma.InputJsonValue;
  const calculatorConfigJson =
    parsed.calculatorConfig as unknown as Prisma.InputJsonValue;
  const paymentTermsJson = parsed.paymentTerms.map((term) => ({
    code: term.code.trim(),
    label: term.label.trim(),
    days: term.days,
  })) as unknown as Prisma.InputJsonValue;
  const defaultPaymentTermsCode = parsed.defaultPaymentTerms.trim();

  const data = {
    businessName: parsed.businessName,
    businessEmail: parsed.businessEmail || null,
    businessPhone: parsed.businessPhone || null,
    businessAddress: parsed.businessAddress || null,
    abn: parsed.abn || null,
    taxRate: parsed.taxRate !== undefined ? String(parsed.taxRate) : null,
    numberingQuotePrefix: parsed.numberingQuotePrefix,
    numberingInvoicePrefix: parsed.numberingInvoicePrefix,
    defaultPaymentTerms: defaultPaymentTermsCode,
    bankDetails: parsed.bankDetails || null,
    jobCreationPolicy: parsed.jobCreationPolicy as JobCreationPolicy,
    defaultCurrency: parsed.defaultCurrency,
    shippingOptions: shippingOptionsJson,
    paymentTerms: paymentTermsJson,
    calculatorConfig: calculatorConfigJson,
    autoDetachJobOnComplete: parsed.autoDetachJobOnComplete,
    autoArchiveCompletedJobsAfterDays: parsed.autoArchiveCompletedJobsAfterDays,
    preventAssignToOffline: parsed.preventAssignToOffline,
    preventAssignToMaintenance: parsed.preventAssignToMaintenance,
    maxActivePrintingPerPrinter: parsed.maxActivePrintingPerPrinter,
    overdueDays: parsed.overdueDays,
    reminderCadenceDays: parsed.reminderCadenceDays,
    enableEmailSend: parsed.enableEmailSend,
  } as const;

  const updated = await prisma.$transaction(async (tx) => {
    const settings = await tx.settings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    await tx.numberSequence.upsert({
      where: { kind: "quote" },
      update: { prefix: parsed.numberingQuotePrefix },
      create: {
        kind: "quote",
        prefix: parsed.numberingQuotePrefix,
        current: 1,
      },
    });

    await tx.numberSequence.upsert({
      where: { kind: "invoice" },
      update: { prefix: parsed.numberingInvoicePrefix },
      create: {
        kind: "invoice",
        prefix: parsed.numberingInvoicePrefix,
        current: 1,
      },
    });

    await tx.activityLog.create({
      data: {
        action: "SETTINGS_UPDATED",
        message: "Settings updated",
        metadata: {
          sections: Object.keys(payload as Record<string, unknown>),
        },
      },
    });

    return settings;
  });

  logger.info({
    scope: "settings.update",
    data: { jobCreationPolicy: parsed.jobCreationPolicy },
  });

  return serializeSettings(updated);
}


export async function resolvePaymentTermsOptions(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{
  paymentTerms: PaymentTermOption[];
  defaultPaymentTerms: string;
}> {
  const settings = await tx.settings.findUnique({
    where: { id: 1 },
    select: { paymentTerms: true, defaultPaymentTerms: true },
  });

  const paymentTermsRaw = settings?.paymentTerms;
  const parsed = Array.isArray(paymentTermsRaw)
    ? paymentTermsRaw
        .map((item) => {
          const result = paymentTermSchema.safeParse(item);
          if (!result.success) {
            logger.warn({
              scope: "settings.paymentTerms.resolve",
              message: "Invalid payment term encountered while resolving options",
              error: result.error,
            });
            return null;
          }
          return result.data;
        })
        .filter((item): item is PaymentTermOption => item !== null)
    : [];

  const paymentTerms =
    parsed.length > 0
      ? parsed
      : DEFAULT_PAYMENT_TERMS.map((term) => ({ ...term }));

  const defaultPaymentTerms =
    settings?.defaultPaymentTerms &&
    paymentTerms.some((term) => term.code === settings.defaultPaymentTerms)
      ? settings.defaultPaymentTerms
      : paymentTerms[0]?.code ?? DEFAULT_PAYMENT_TERMS[0].code;

  return { paymentTerms, defaultPaymentTerms };
}
