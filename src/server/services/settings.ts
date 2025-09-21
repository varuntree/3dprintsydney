import { prisma } from "@/server/db/client";
import { JobCreationPolicy, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import {
  settingsInputSchema,
  type SettingsInput,
  calculatorConfigSchema,
  shippingOptionSchema,
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
      return parsed.success ? parsed.data : null;
    })
    .filter(
      (item): item is SettingsInput["shippingOptions"][number] => item !== null,
    );

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
    defaultPaymentTerms: settings.defaultPaymentTerms ?? "Due on receipt",
    bankDetails: settings.bankDetails ?? "",
    jobCreationPolicy: settings.jobCreationPolicy,
    shippingOptions,
    calculatorConfig: calculator,
    defaultCurrency: settings.defaultCurrency ?? "AUD",
    stripeSecretKey: settings.stripeSecretKey ?? "",
    stripePublishableKey: settings.stripePublishableKey ?? "",
    stripeWebhookSecret: settings.stripeWebhookSecret ?? "",
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

  const data = {
    businessName: parsed.businessName,
    businessEmail: parsed.businessEmail || null,
    businessPhone: parsed.businessPhone || null,
    businessAddress: parsed.businessAddress || null,
    abn: parsed.abn || null,
    taxRate: parsed.taxRate !== undefined ? String(parsed.taxRate) : null,
    numberingQuotePrefix: parsed.numberingQuotePrefix,
    numberingInvoicePrefix: parsed.numberingInvoicePrefix,
    defaultPaymentTerms: parsed.defaultPaymentTerms,
    bankDetails: parsed.bankDetails || null,
    jobCreationPolicy: parsed.jobCreationPolicy as JobCreationPolicy,
    defaultCurrency: parsed.defaultCurrency,
    shippingOptions: shippingOptionsJson,
    calculatorConfig: calculatorConfigJson,
    stripeSecretKey: parsed.stripeSecretKey || null,
    stripePublishableKey: parsed.stripePublishableKey || null,
    stripeWebhookSecret: parsed.stripeWebhookSecret || null,
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
