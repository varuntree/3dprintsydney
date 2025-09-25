-- Drop Stripe configuration columns (legacy keys now embedded)
ALTER TABLE "Settings" DROP COLUMN "stripeSecretKey";
ALTER TABLE "Settings" DROP COLUMN "stripePublishableKey";
ALTER TABLE "Settings" DROP COLUMN "stripeWebhookSecret";
