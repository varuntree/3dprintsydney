ALTER TABLE "Settings" ADD COLUMN "paymentTerms" JSON;
UPDATE "Settings" SET "defaultPaymentTerms" = 'COD' WHERE "defaultPaymentTerms" IS NULL OR "defaultPaymentTerms" = '';
