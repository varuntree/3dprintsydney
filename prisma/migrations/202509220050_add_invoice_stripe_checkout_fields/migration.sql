-- Add Stripe checkout persistence fields to invoices
ALTER TABLE "Invoice" ADD COLUMN "stripeSessionId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripeCheckoutUrl" TEXT;
