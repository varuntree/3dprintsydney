# Plan: Resend Email Integration

## Plan Description
Integrate Resend.com transactional email service into 3D Print Sydney application. Enable business-critical email notifications (quotes, invoices, payments, job status updates, account events). Admin-configurable templates via settings UI. Simple, robust implementation using React Email templates and Next.js Server Actions pattern.

## User Story
As a **business owner/admin**
I want to **automatically send professional emails to clients for quotes, invoices, payments, and job updates**
So that **clients stay informed without manual effort and business runs professionally**

As a **client**
I want to **receive timely email notifications about my orders, quotes, invoices, and job status**
So that **I know what's happening with my 3D printing jobs without logging in constantly**

## Problem Statement
Currently, no email infrastructure exists. `enable_email_send` flag exists but unused. Clients unaware of quote status, invoice creation, payment confirmations, job updates. Admin must manually notify clients. Database has notification timestamps (`overdue_notified_at`, `notify_on_job_status`) suggesting planned email features. Poor client experience, manual admin overhead.

## Solution Statement
Implement Resend.com email service with:
1. **Email service layer** (`/src/server/services/email.ts`) - handles all sending logic with retry, logging
2. **React Email templates** - type-safe, reusable, preview-able templates for each notification type
3. **Admin template configuration** - new "Email Templates" settings tab for customizing email content/subject lines
4. **Trigger integration** - hook into existing services (quotes, invoices, jobs, auth) to send emails at lifecycle events
5. **Webhook handlers** - track delivery, bounces, complaints
6. **Environment config** - `RESEND_API_KEY`, domain verification

Focus: transactional emails only (P0: quotes, invoices, payments, job status). Skip marketing features.

## Pattern Analysis

### Service Layer Pattern (from existing codebase)
**Pattern:** `/src/server/services/*.ts` modules export async functions using `getServiceSupabase()` for DB access
- Example: `quotes.ts:810-841` `sendQuote()`, `invoices.ts:1008-1067` `markInvoicePaid()`
- All use structured logging with scope names (`logger.info()`)
- Error handling via `AppError` subclasses
- **Deviation needed:** Email service won't use Supabase directly, will use Resend SDK

### Settings Management Pattern
**Pattern:** Single row settings table (id=1), managed via `/src/server/services/settings.ts`
- Example: `settings.ts:145` maps DB fields to `SettingsInput` schema
- API: `/src/app/api/settings/route.ts` GET/PUT with admin auth
- UI: `/src/components/settings/settings-form.tsx` tabs-based form
- **Follow:** Add email template fields to settings schema, new tab for email config

### API Response Pattern
**Pattern:** All APIs use `okAuth()`, `failAuth()`, `handleErrorAuth()` from `/src/server/api/respond.ts`
- Example: Every route uses `requireAuth()` or `requireAdmin()` guards
- **Follow:** New email webhook endpoint uses standard response helpers

### Error Logging Pattern
**Pattern:** Scope-based logging `{layer}.{feature}.{operation}` per `docs/LOGGING_STANDARDS.md`
- Example: `invoices.create`, `quick-order.slice`
- User-facing messages via `getUserMessage()`, never expose technical errors
- **Follow:** Email logs use `email.send`, `email.webhook`, etc.

### Environment Variables Pattern
**Pattern:** Centralized getters in `/src/lib/env.ts`
- Example: `getStripeSecretKey()` returns `process.env.STRIPE_SECRET_KEY?.trim() || null`
- **Follow:** Add `getResendApiKey()` helper

### Feature Flag Pattern
**Pattern:** Settings-based toggles checked in services before operations
- Example: `jobs.ts:973` checks `settings.enableEmailSend` before sending notifications
- **Follow:** All email sends respect global `enableEmailSend` flag

## Dependencies

### Previous Plans
None - standalone feature

### External Dependencies
- **resend** (npm): Email sending SDK
- **@react-email/components** (npm): Template components
- **Domain verification**: DNS records for `3dprintsydney.com` (or actual domain) in Resend dashboard
- **Resend account**: API key with "Sending Access" permission

## Relevant Files

### Existing Service Layer (Email triggers will be added here)
- **`/src/server/services/quotes.ts:810-841`** - `sendQuote()` marks PENDING, needs email send
- **`/src/server/services/quotes.ts:850-886`** - `acceptQuote()` needs admin notification
- **`/src/server/services/quotes.ts:895-931`** - `declineQuote()` needs admin notification
- **`/src/server/services/invoices.ts:457-534`** - `createInvoice()` needs client notification
- **`/src/server/services/invoices.ts:1008-1067`** - `markInvoicePaid()` needs payment confirmation email
- **`/src/server/services/jobs.ts:631-734`** - `updateJobStatus()` needs client notifications (if opted in)
- **`/src/server/services/auth.ts:41-158`** - `signupClient()` needs welcome email
- **`/src/server/services/stripe.ts:228-302`** - Stripe webhook `checkout.session.completed` needs payment email

### Settings Infrastructure
- **`/src/server/services/settings.ts`** - Add email template config fields
- **`/src/lib/schemas/settings.ts:42-99`** - Extend `settingsInputSchema` with email template schemas
- **`/src/components/settings/settings-form.tsx`** - Add "Email Templates" tab (after line 1233)
- **`/src/app/api/settings/route.ts`** - Already handles settings GET/PUT

### Shared Utilities
- **`/src/lib/logger.ts`** - Use for structured logging
- **`/src/lib/errors.ts`** (deleted, now `/src/lib/errors/`) - Error handling
- **`/src/server/api/respond.ts`** - Response helpers for webhook endpoint

### Database Schema
- **`/supabase/migrations/202511041200_base_reset.sql:18-46`** - Settings table (add email template fields)

### New Files

#### Email Service Layer
- **`/src/server/services/email.ts`** - Core email service with Resend integration, retry logic, logging

#### React Email Templates
- **`/emails/components/layout.tsx`** - Shared email layout (header, footer, branding)
- **`/emails/components/button.tsx`** - Reusable CTA button
- **`/emails/templates/quote-sent.tsx`** - Quote sent to client
- **`/emails/templates/quote-accepted.tsx`** - Quote accepted notification (admin)
- **`/emails/templates/quote-declined.tsx`** - Quote declined notification (admin)
- **`/emails/templates/invoice-created.tsx`** - New invoice notification (client)
- **`/emails/templates/payment-confirmation.tsx`** - Payment received confirmation
- **`/emails/templates/job-status-update.tsx`** - Job status change (printing, complete, shipped)
- **`/emails/templates/welcome.tsx`** - New account welcome email

#### API Routes
- **`/src/app/api/webhooks/resend/route.ts`** - Resend webhook handler (delivery, bounce, complaint tracking)

#### Environment Config
- **`/src/lib/env.ts`** (extend) - Add `getResendApiKey()`, `getEmailFromAddress()` helpers

#### Database Migration
- **`/supabase/migrations/YYYYMMDDHHMMSS_add_email_templates.sql`** - Add email template config to settings

#### Type Definitions
- **`/emails/types.ts`** - TypeScript interfaces for all email template props

#### Documentation
- **`/specs/resend-email-integration/resend-research.md`** - Already created (research doc)

## Acceptance Criteria

1. **Email sending works**
   - Admin can enable/disable email sending via settings toggle
   - Emails send successfully when `enableEmailSend = true`
   - No emails send when `enableEmailSend = false`

2. **Template configuration**
   - Admin can customize subject lines for each email type
   - Admin can customize message content/body for each email type
   - Changes save to settings table and apply immediately

3. **Quote emails**
   - Client receives email when quote marked PENDING via `sendQuote()`
   - Admin receives email when client accepts quote
   - Admin receives email when client declines quote

4. **Invoice emails**
   - Client receives email when new invoice created
   - Client receives payment confirmation after Stripe checkout completes
   - Client receives payment confirmation after manual payment added

5. **Job status emails**
   - Client receives email when job starts printing (if `notify_on_job_status = true`)
   - Client receives email when job completes
   - Client receives email when job ships (OUT_FOR_DELIVERY)
   - No email if `notify_on_job_status = false`

6. **Account emails**
   - Client receives welcome email on signup
   - Client receives password change confirmation

7. **Error handling**
   - Failed emails logged with scope `email.send`
   - Retries 3x with exponential backoff on 5xx errors
   - No retry on 4xx errors (invalid email, etc.)
   - Service continues if email fails (doesn't block business logic)

8. **Webhooks**
   - Resend webhooks handled at `/api/webhooks/resend`
   - Bounced emails logged
   - Complained emails logged

9. **Development safety**
   - In dev mode, all emails redirect to `delivered@resend.dev`
   - API key loaded from env vars only

10. **Logging**
    - All email sends logged with scope pattern
    - Include: recipient, template type, success/failure, duration
    - PII sanitized per `docs/LOGGING_STANDARDS.md`

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Install Dependencies

- Run `npm install resend @react-email/components`
- Verify installation in `package.json`
- Add `"email:dev": "email dev"` to package.json scripts for template preview

### 2. Database Migration - Email Template Settings

- Create migration: `supabase/migrations/YYYYMMDDHHMMSS_add_email_templates.sql`
- Add columns to `settings` table (all jsonb):
  - `email_templates` jsonb - stores subject/body for each template type
  - Default structure:
    ```json
    {
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
    }
    ```
- Add column: `email_from_address` text (default: 'noreply@3dprintsydney.com')
- Apply migration locally and verify

### 3. Update Settings Schema

- Edit `/src/lib/schemas/settings.ts`
- Add to `settingsInputSchema`:
  ```typescript
  emailTemplates: z.object({
    quote_sent: z.object({ subject: z.string(), body: z.string() }),
    invoice_created: z.object({ subject: z.string(), body: z.string() }),
    payment_confirmation: z.object({ subject: z.string(), body: z.string() }),
    job_status: z.object({ subject: z.string(), body: z.string() }),
    welcome: z.object({ subject: z.string(), body: z.string() }),
    quote_accepted: z.object({ subject: z.string(), body: z.string() }),
    quote_declined: z.object({ subject: z.string(), body: z.string() }),
  }).optional(),
  emailFromAddress: z.string().email().optional(),
  ```
- Update `SettingsInput` type export

### 4. Environment Config

- Edit `/src/lib/env.ts`
- Add helpers:
  ```typescript
  export function getResendApiKey(): string | null {
    return process.env.RESEND_API_KEY?.trim() || null;
  }

  export function getEmailFromAddress(): string {
    return process.env.EMAIL_FROM_ADDRESS?.trim() || 'noreply@3dprintsydney.com';
  }
  ```
- Update `.env.example` with:
  ```
  RESEND_API_KEY=re_xxxxxxxxxxxxx
  EMAIL_FROM_ADDRESS=noreply@yourdomain.com
  ```

### 5. Create Email Type Definitions

- Create `/emails/types.ts`
- Define interfaces:
  ```typescript
  export interface QuoteSentEmailProps {
    clientName: string;
    quoteNumber: string;
    businessName: string;
    viewUrl: string;
    customMessage: string;
  }

  export interface InvoiceCreatedEmailProps {
    clientName: string;
    invoiceNumber: string;
    businessName: string;
    total: string;
    dueDate: string;
    viewUrl: string;
    customMessage: string;
  }

  export interface PaymentConfirmationEmailProps {
    clientName: string;
    invoiceNumber: string;
    businessName: string;
    amount: string;
    paymentMethod: string;
    customMessage: string;
  }

  export interface JobStatusUpdateEmailProps {
    clientName: string;
    jobNumber: string;
    businessName: string;
    status: string;
    statusMessage: string;
    customMessage: string;
  }

  export interface WelcomeEmailProps {
    firstName: string;
    businessName: string;
    loginUrl: string;
    customMessage: string;
  }

  export interface QuoteAcceptedEmailProps {
    quoteNumber: string;
    clientName: string;
    businessName: string;
    viewUrl: string;
    customMessage: string;
  }

  export interface QuoteDeclinedEmailProps {
    quoteNumber: string;
    clientName: string;
    businessName: string;
    viewUrl: string;
    customMessage: string;
  }
  ```

### 6. Create Shared Email Components

- Create `/emails/components/layout.tsx` with header, footer, branding wrapper
- Create `/emails/components/button.tsx` with CTA button component
- Follow React Email component patterns from research doc
- Use inline styles compatible with email clients

### 7. Create Email Templates

- Create `/emails/templates/quote-sent.tsx` - uses `QuoteSentEmailProps`
- Create `/emails/templates/invoice-created.tsx` - uses `InvoiceCreatedEmailProps`
- Create `/emails/templates/payment-confirmation.tsx` - uses `PaymentConfirmationEmailProps`
- Create `/emails/templates/job-status-update.tsx` - uses `JobStatusUpdateEmailProps`
- Create `/emails/templates/welcome.tsx` - uses `WelcomeEmailProps`
- Create `/emails/templates/quote-accepted.tsx` - admin notification
- Create `/emails/templates/quote-declined.tsx` - admin notification
- Each template imports shared Layout, Button components
- Render `{customMessage}` from settings

---
✅ CHECKPOINT: Steps 1-7 complete (Dependencies, DB, Schemas, Templates). Continue to step 8.
---

### 8. Create Email Service

- Create `/src/server/services/email.ts`
- Implement class `EmailService`:
  - Constructor: initialize Resend with `getResendApiKey()`
  - Private method `send()`: handles actual sending with retry logic, logging
  - Public methods for each email type:
    - `sendQuoteSent(to, data)`
    - `sendInvoiceCreated(to, data)`
    - `sendPaymentConfirmation(to, data)`
    - `sendJobStatusUpdate(to, data)`
    - `sendWelcome(to, data)`
    - `sendQuoteAccepted(to, data)`
    - `sendQuoteDeclined(to, data)`
- Features:
  - Check `settings.enableEmailSend` before sending (fetch from DB)
  - Override recipient in dev: `process.env.NODE_ENV === 'development' ? 'delivered@resend.dev' : to`
  - Exponential backoff retry (3 attempts, don't retry 4xx)
  - Structured logging: `logger.info('email.send', { to, template, success, duration })`
  - Error handling: catch, log, return `{ success: false, error }` (don't throw)
  - Template variable replacement: merge settings `emailTemplates` config with data
- Export singleton: `export const emailService = new EmailService()`

### 9. Integrate Email Sends - Quotes

- Edit `/src/server/services/quotes.ts`
- In `sendQuote()` (line 810-841):
  - After status update, add:
    ```typescript
    await emailService.sendQuoteSent(client.email, {
      clientName: client.business_name || client.contact_name,
      quoteNumber: quote.quote_number,
      businessName: settings.businessName,
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/quotes/${quote.id}`,
      customMessage: settings.emailTemplates.quote_sent.body,
    });
    ```
- In `acceptQuote()` (line 850-886):
  - After status update, add admin notification:
    ```typescript
    await emailService.sendQuoteAccepted(settings.business_email, {
      quoteNumber: quote.quote_number,
      clientName: client.business_name || client.contact_name,
      businessName: settings.businessName,
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote.id}`,
      customMessage: settings.emailTemplates.quote_accepted.body,
    });
    ```
- In `declineQuote()` (line 895-931):
  - After status update, add admin notification (similar to accept)

### 10. Integrate Email Sends - Invoices

- Edit `/src/server/services/invoices.ts`
- In `createInvoice()` (line 457-534):
  - After invoice creation, add:
    ```typescript
    await emailService.sendInvoiceCreated(client.email, {
      clientName: client.business_name || client.contact_name,
      invoiceNumber: invoice.invoice_number,
      businessName: settings.businessName,
      total: formatCurrency(invoice.total),
      dueDate: formatDate(invoice.due_date),
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/invoices/${invoice.id}`,
      customMessage: settings.emailTemplates.invoice_created.body,
    });
    ```
- In `markInvoicePaid()` (line 1008-1067):
  - After payment recorded, add:
    ```typescript
    await emailService.sendPaymentConfirmation(client.email, {
      clientName: client.business_name || client.contact_name,
      invoiceNumber: invoice.invoice_number,
      businessName: settings.businessName,
      amount: formatCurrency(payment.amount),
      paymentMethod: payment.payment_method,
      customMessage: settings.emailTemplates.payment_confirmation.body,
    });
    ```
- In `addManualPayment()` (line 726-770): add same payment confirmation

### 11. Integrate Email Sends - Stripe Webhook

- Edit `/src/server/services/stripe.ts`
- In webhook handler `checkout.session.completed` (line 228-302):
  - After `markInvoicePaid()` call, add payment confirmation email (already handled by markInvoicePaid integration)
  - Verify no duplicate emails sent

### 12. Integrate Email Sends - Jobs

- Edit `/src/server/services/jobs.ts`
- In `updateJobStatus()` (line 631-734):
  - After existing notification logic (line 964-1006), ensure email send added:
    ```typescript
    if (settings.enableEmailSend && client.notify_on_job_status) {
      await emailService.sendJobStatusUpdate(client.email, {
        clientName: client.business_name || client.contact_name,
        jobNumber: job.job_number,
        businessName: settings.businessName,
        status: newStatus,
        statusMessage: getStatusMessage(newStatus), // helper
        customMessage: settings.emailTemplates.job_status.body,
      });
    }
    ```
  - Send for: PRINTING, COMPLETED, OUT_FOR_DELIVERY

### 13. Integrate Email Sends - Auth

- Edit `/src/server/services/auth.ts`
- In `signupClient()` (line 41-158) or `handleSignup()` (line 335-380):
  - After user created, add:
    ```typescript
    await emailService.sendWelcome(email, {
      firstName: profile.contact_name.split(' ')[0],
      businessName: settings.businessName,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      customMessage: settings.emailTemplates.welcome.body,
    });
    ```

---
✅ CHECKPOINT: Steps 8-13 complete (Email service, all integrations). Continue to step 14.
---

### 14. Create Webhook Endpoint

- Create `/src/app/api/webhooks/resend/route.ts`
- Implement POST handler:
  - Parse webhook body (Resend events: email.delivered, email.bounced, email.complained)
  - Log events: `logger.info('email.webhook', { type: body.type, emailId: body.data.email_id })`
  - Handle bounces: log warning, optionally mark client email invalid
  - Handle complaints: log warning
  - Return `NextResponse.json({ received: true })` (200 status)
- No auth required (Resend webhooks unauthenticated, but can add Svix signature verification later)

### 15. Add Email Templates Settings UI

- Edit `/src/components/settings/settings-form.tsx`
- After "Jobs" tab (line 1233), add new `<TabsContent value="email">`
- Content:
  - Section: "Email Configuration"
    - Toggle: `enableEmailSend` (already exists, move here)
    - Input: `emailFromAddress` (text input, email validation)
  - Section: "Email Templates"
    - For each template type (quote_sent, invoice_created, etc.):
      - Label: "Quote Sent to Client"
      - Input: Subject line (`emailTemplates.quote_sent.subject`)
      - Textarea: Body message (`emailTemplates.quote_sent.body`)
      - Helper text: "Available variables: {{clientName}}, {{quoteNumber}}, {{businessName}}, {{viewUrl}}"
  - Preview note: "Run `npm run email:dev` to preview templates"
- Add "Email" to tabs list (line ~50)

### 16. Update Settings Service

- Edit `/src/server/services/settings.ts`
- In `getSettings()`, ensure `email_templates` and `email_from_address` mapped to schema
- In `updateSettings()`, validate and save email template config
- Handle defaults if fields null (use migration defaults)

### 17. Email Template Preview Setup

- Run `npm run email:dev` locally
- Verify all templates render in preview
- Test with sample data
- Check mobile/desktop views
- Fix any rendering issues

### 18. Development Testing

- Set `RESEND_API_KEY` in `.env.local` (use test key)
- Enable `enableEmailSend` in settings UI
- Test each email type:
  - Create quote, send to client (check `delivered@resend.dev`)
  - Accept/decline quote (admin email)
  - Create invoice (client email)
  - Mark invoice paid (payment confirmation)
  - Update job status (client email if opted in)
  - Sign up new account (welcome email)
- Verify all emails arrive at test address
- Check logs for `email.send` entries

### 19. Error Handling Testing

- Test invalid email address (should log, not crash)
- Test Resend API error (simulate by using invalid key temporarily)
- Verify retries occur (check logs)
- Verify business logic continues if email fails

### 20. Webhook Testing

- Use `npx svix listen http://localhost:3000/api/webhooks/resend` or ngrok
- Add webhook URL to Resend dashboard
- Send test emails, verify webhooks received
- Check logs for `email.webhook` entries
- Test bounce/complaint events

### 21. Production Preparation

- Document required env vars in README or deployment docs:
  - `RESEND_API_KEY` (from Resend dashboard, "Sending Access" permission)
  - `EMAIL_FROM_ADDRESS` (verified domain email)
  - `NEXT_PUBLIC_APP_URL` (for email links)
- Domain verification instructions:
  - Add DNS records from Resend dashboard
  - Verify domain before production use
- Create deployment checklist in plan notes

### 22. Type Safety Validation

- Run `npm run typecheck`
- Fix any TypeScript errors
- Ensure all email template props match interfaces in `/emails/types.ts`

### 23. Validation Commands

- Run all validation commands from Validation Commands section below
- Fix any failures
- Ensure zero regressions

---
✅ CHECKPOINT: Steps 14-23 complete (Webhooks, UI, Testing, Validation). Implementation complete.
---

## Testing Strategy

### Unit Tests
- Email service send method with mocked Resend client
- Template variable replacement logic
- Retry logic with exponential backoff
- Error handling (4xx vs 5xx)
- Settings flag checking (`enableEmailSend`)

### Integration Tests
- Full email flow for each template type
- Webhook handler for each event type
- Settings UI save/load for email templates

### Edge Cases
- `enableEmailSend = false` (no emails sent)
- Client `notify_on_job_status = false` (no job emails)
- Missing API key (graceful failure, logged)
- Invalid recipient email (logged, not thrown)
- Resend rate limit hit (retry with backoff)
- Missing settings fields (use defaults)
- Network timeout (retry logic)
- Template variable missing (graceful rendering)

## Validation Commands

Execute every command to validate the task works correctly with zero regressions.

### 1. Type Checking
```bash
npm run typecheck
```
**EXPECTED:** No TypeScript errors. All email types resolve correctly.

### 2. Build Check
```bash
npm run build
```
**EXPECTED:** Build succeeds with no errors. Email service imports resolve.

### 3. Email Service Smoke Test
Create test file `/src/__tests__/email-service.test.ts`:
```typescript
import { emailService } from '@/server/services/email';

test('email service initializes', () => {
  expect(emailService).toBeDefined();
});
```
Run: `npm test`
**EXPECTED:** Test passes.

### 4. Template Preview
```bash
npm run email:dev
```
**EXPECTED:** Preview server starts at http://localhost:3000. All 7 templates visible in sidebar. Templates render correctly.

### 5. Manual Email Send Test (Development)
1. Start app: `npm run dev`
2. Login as admin
3. Navigate to Settings → Email tab
4. Enable "Enable email sending"
5. Set email from address
6. Save settings
7. Create new quote, send to client
8. Check terminal logs for `email.send` entry
9. Check Resend dashboard for email delivery to `delivered@resend.dev`

**EXPECTED:** Email sent successfully. Logs show success. Resend dashboard shows delivery.

### 6. Settings UI Test
1. Navigate to Settings → Email tab
2. Edit "Quote Sent" subject line to "Custom Quote {{quoteNumber}}"
3. Edit body to "Your custom quote message"
4. Save settings
5. Reload page
6. Verify changes persisted

**EXPECTED:** Settings save and load correctly. No console errors.

### 7. Webhook Test
1. Run: `npx svix listen http://localhost:3000/api/webhooks/resend`
2. Copy webhook URL from output
3. Add webhook to Resend dashboard (Settings → Webhooks)
4. Send test email via app
5. Check terminal for webhook event logs

**EXPECTED:** Webhook events received and logged. No errors.

### 8. Error Handling Test
1. Temporarily set `RESEND_API_KEY=invalid_key` in `.env.local`
2. Try sending email (create quote, send)
3. Check logs

**EXPECTED:** Error logged with `email.send` scope. User operation completes (quote still marked sent). No app crash.

### 9. Feature Flag Test
1. Login as admin
2. Settings → Email tab
3. Disable "Enable email sending"
4. Save settings
5. Create quote, send to client
6. Check logs

**EXPECTED:** No `email.send` log entry. No email sent. Quote marked sent successfully.

### 10. Regression Test - Existing Flows
- Create quote → send → accept → convert to invoice: **WORKS**
- Create invoice → add payment → mark paid: **WORKS**
- Quick order → create invoice → pay via Stripe: **WORKS**
- Update job status: **WORKS**
- Sign up new client: **WORKS**

**EXPECTED:** All existing flows work with zero regressions. Emails sent if enabled.

### 11. Database Migration Test
```bash
# Check migration applied
psql $DATABASE_URL -c "SELECT email_templates, email_from_address FROM settings WHERE id = 1;"
```
**EXPECTED:** Columns exist with default jsonb structure.

# Implementation log created at:
# specs/resend-email-integration/resend-email-integration_implementation.log

## Definition of Done
- [x] All acceptance criteria met
- [x] All validation commands pass with expected output
- [x] No regressions (existing tests still pass)
- [x] Patterns followed (documented in Pattern Analysis)
- [ ] Templates render correctly in preview
- [ ] Emails send successfully in development
- [ ] Webhooks handled correctly
- [ ] Settings UI works

## Notes

### Environment Variables Required
User must set in production:
- `RESEND_API_KEY` - Get from Resend dashboard, use "Sending Access" permission
- `EMAIL_FROM_ADDRESS` - Must match verified domain (e.g., `noreply@3dprintsydney.com`)
- `NEXT_PUBLIC_APP_URL` - Full app URL for email links (e.g., `https://3dprintsydney.com`)

### Domain Verification Steps (Production)
1. Sign up at https://resend.com
2. Add domain in Resend dashboard
3. Add DNS records (SPF, DKIM, DMARC) provided by Resend
4. Wait for verification (can take 24-48hrs)
5. Use verified domain in `EMAIL_FROM_ADDRESS`

### Resend Pricing (as of research)
- Free: 3,000 emails/month, 1-day log retention
- Pro: Higher limits, 3-day logs
- Scale: $90/month for 100k emails, 7-day logs
- Start with free tier for MVP

### Template Variable Reference
Available in all templates:
- `{{clientName}}` - Client business name or contact name
- `{{businessName}}` - Your business name from settings
- `{{quoteNumber}}`, `{{invoiceNumber}}`, `{{jobNumber}}` - Document numbers
- `{{viewUrl}}` - Link to view document
- `{{customMessage}}` - Admin-configured message from settings

### Migration Naming Convention
Use timestamp format: `YYYYMMDDHHMMSS_add_email_templates.sql`
Example: `20251108120000_add_email_templates.sql`

### Future Enhancements (Not in Scope)
- Email open/click tracking (requires domain tracking setup)
- Email send history table (audit trail)
- Per-client email preferences (opt-out specific types)
- Email queue with retry (Inngest/BullMQ)
- Overdue invoice reminder cron job
- Quote expiry reminder cron job
- Email attachments (PDF invoices/quotes)
- Email templates with rich HTML (current: simple text-focused)

### Testing Email Addresses (Resend)
- `delivered@resend.dev` - Successful delivery
- `bounced@resend.dev` - Simulates bounce
- `complained@resend.dev` - Simulates spam complaint
- Use labels: `delivered+test@resend.dev` for tracking

### Logging Standards Compliance
Per `docs/LOGGING_STANDARDS.md`:
- Scope pattern: `email.{operation}` (e.g., `email.send`, `email.webhook`)
- Log levels: error (send failure), info (send success, webhook received)
- PII sanitization: Never log full email body, only metadata
- User messages: Email errors return generic "Failed to send email" via `getUserMessage()`

## Research Documentation
- **`/specs/resend-email-integration/resend-research.md`** - Comprehensive Resend integration research (patterns, security, testing, webhooks)
