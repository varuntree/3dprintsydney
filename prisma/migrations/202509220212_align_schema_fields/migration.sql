ALTER TABLE "Invoice" ADD COLUMN "overdueNotifiedAt" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "voidedAt" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "writeOffReason" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "writtenOffAt" DATETIME;

ALTER TABLE "Job" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Job" ADD COLUMN "archivedReason" TEXT;
ALTER TABLE "Job" ADD COLUMN "completedBy" TEXT;
ALTER TABLE "Job" ADD COLUMN "lastRunStartedAt" DATETIME;

ALTER TABLE "Printer" ADD COLUMN "lastMaintenanceAt" DATETIME;
ALTER TABLE "Printer" ADD COLUMN "maintenanceNote" TEXT;

ALTER TABLE "Quote" ADD COLUMN "acceptedAt" DATETIME;
ALTER TABLE "Quote" ADD COLUMN "decisionNote" TEXT;
ALTER TABLE "Quote" ADD COLUMN "declinedAt" DATETIME;
ALTER TABLE "Quote" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "Quote" ADD COLUMN "sentAt" DATETIME;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT '',
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "businessAddress" TEXT,
    "abn" TEXT,
    "taxRate" DECIMAL,
    "numberingQuotePrefix" TEXT NOT NULL DEFAULT 'QT-',
    "numberingInvoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "defaultPaymentTerms" TEXT DEFAULT 'COD',
    "bankDetails" TEXT,
    "shippingOptions" JSONB,
    "paymentTerms" JSONB,
    "calculatorConfig" JSONB,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'AUD',
    "jobCreationPolicy" TEXT NOT NULL DEFAULT 'ON_PAYMENT',
    "autoDetachJobOnComplete" BOOLEAN NOT NULL DEFAULT true,
    "autoArchiveCompletedJobsAfterDays" INTEGER NOT NULL DEFAULT 7,
    "preventAssignToOffline" BOOLEAN NOT NULL DEFAULT true,
    "preventAssignToMaintenance" BOOLEAN NOT NULL DEFAULT true,
    "maxActivePrintingPerPrinter" INTEGER NOT NULL DEFAULT 1,
    "overdueDays" INTEGER NOT NULL DEFAULT 0,
    "reminderCadenceDays" INTEGER NOT NULL DEFAULT 7,
    "enableEmailSend" BOOLEAN NOT NULL DEFAULT false,
    "stripeSecretKey" TEXT,
    "stripePublishableKey" TEXT,
    "stripeWebhookSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" (
    "id", "businessName", "businessEmail", "businessPhone", "businessAddress", "abn",
    "taxRate", "numberingQuotePrefix", "numberingInvoicePrefix", "defaultPaymentTerms",
    "bankDetails", "shippingOptions", "calculatorConfig", "defaultCurrency",
    "jobCreationPolicy", "stripeSecretKey", "stripePublishableKey", "stripeWebhookSecret",
    "createdAt", "updatedAt"
)
SELECT
    "id", "businessName", "businessEmail", "businessPhone", "businessAddress", "abn",
    "taxRate", "numberingQuotePrefix", "numberingInvoicePrefix", "defaultPaymentTerms",
    "bankDetails", "shippingOptions", "calculatorConfig", "defaultCurrency",
    "jobCreationPolicy", "stripeSecretKey", "stripePublishableKey", "stripeWebhookSecret",
    "createdAt", "updatedAt"
FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE INDEX IF NOT EXISTS "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");
CREATE INDEX IF NOT EXISTS "Invoice_paidAt_idx" ON "Invoice"("paidAt");
CREATE INDEX IF NOT EXISTS "Job_printerId_status_queuePosition_idx" ON "Job"("printerId", "status", "queuePosition");
CREATE INDEX IF NOT EXISTS "Job_status_completedAt_idx" ON "Job"("status", "completedAt");
CREATE INDEX IF NOT EXISTS "Job_archivedAt_idx" ON "Job"("archivedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_processorId_key" ON "Payment"("processorId");
CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx" ON "Payment"("paidAt");
