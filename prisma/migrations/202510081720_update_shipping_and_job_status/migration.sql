-- Redefine Settings table to replace shippingOptions with shippingRegions/defaultShippingRegion
PRAGMA foreign_keys=OFF;

CREATE TABLE "Settings_new" (
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
    "shippingRegions" JSONB,
    "defaultShippingRegion" TEXT DEFAULT 'sydney_metro',
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "Settings_new" (
    "id",
    "businessName",
    "businessEmail",
    "businessPhone",
    "businessAddress",
    "abn",
    "taxRate",
    "numberingQuotePrefix",
    "numberingInvoicePrefix",
    "defaultPaymentTerms",
    "bankDetails",
    "shippingRegions",
    "defaultShippingRegion",
    "paymentTerms",
    "calculatorConfig",
    "defaultCurrency",
    "jobCreationPolicy",
    "autoDetachJobOnComplete",
    "autoArchiveCompletedJobsAfterDays",
    "preventAssignToOffline",
    "preventAssignToMaintenance",
    "maxActivePrintingPerPrinter",
    "overdueDays",
    "reminderCadenceDays",
    "enableEmailSend",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "businessName",
    "businessEmail",
    "businessPhone",
    "businessAddress",
    "abn",
    "taxRate",
    "numberingQuotePrefix",
    "numberingInvoicePrefix",
    "defaultPaymentTerms",
    "bankDetails",
    COALESCE(
      CASE
        WHEN "shippingOptions" IS NOT NULL THEN "shippingOptions"
        ELSE '[{"code":"sydney_metro","label":"Sydney Metro","states":["NSW"],"baseAmount":12.5},{"code":"regional","label":"Regional Australia","states":["NSW","VIC","QLD","SA","WA","NT","TAS","ACT"],"baseAmount":25},{"code":"remote","label":"Remote & Islands","states":["TAS","WA","NT"],"baseAmount":45}]'
      END,
      '[{"code":"sydney_metro","label":"Sydney Metro","states":["NSW"],"baseAmount":12.5},{"code":"regional","label":"Regional Australia","states":["NSW","VIC","QLD","SA","WA","NT","TAS","ACT"],"baseAmount":25},{"code":"remote","label":"Remote & Islands","states":["TAS","WA","NT"],"baseAmount":45}]'
    ) AS shippingRegions,
    'sydney_metro' AS defaultShippingRegion,
    "paymentTerms",
    "calculatorConfig",
    "defaultCurrency",
    "jobCreationPolicy",
    "autoDetachJobOnComplete",
    "autoArchiveCompletedJobsAfterDays",
    "preventAssignToOffline",
    "preventAssignToMaintenance",
    "maxActivePrintingPerPrinter",
    "overdueDays",
    "reminderCadenceDays",
    "enableEmailSend",
    "createdAt",
    "updatedAt"
FROM "Settings";

DROP TABLE "Settings";
ALTER TABLE "Settings_new" RENAME TO "Settings";

PRAGMA foreign_keys=ON;
