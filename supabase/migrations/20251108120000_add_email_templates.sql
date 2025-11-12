-- Add email template configuration to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS email_templates JSONB DEFAULT '{
  "quote_sent": {
    "subject": "Quote {{quoteNumber}} from {{businessName}}",
    "body": "Your quote is ready for review."
  },
  "invoice_created": {
    "subject": "Invoice {{invoiceNumber}} from {{businessName}}",
    "body": "Your invoice is ready."
  },
  "payment_confirmation": {
    "subject": "Payment Received - {{invoiceNumber}}",
    "body": "Thank you for your payment."
  },
  "job_status": {
    "subject": "Job Update: {{jobNumber}} - {{status}}",
    "body": "Your job status has changed."
  },
  "welcome": {
    "subject": "Welcome to {{businessName}}",
    "body": "Thanks for signing up!"
  },
  "quote_accepted": {
    "subject": "[Admin] Quote {{quoteNumber}} Accepted",
    "body": "Client accepted quote."
  },
  "quote_declined": {
    "subject": "[Admin] Quote {{quoteNumber}} Declined",
    "body": "Client declined quote."
  }
}'::jsonb;

-- Add email from address configuration
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS email_from_address TEXT DEFAULT 'noreply@3dprintsydney.com';
