import { render } from '@react-email/components';
import { getSettings } from '@/server/services/settings';
import { getResendClient } from './client';
import { getEmailConfig } from './config';
import { logger } from '@/lib/logger';
import { getServiceSupabase } from '@/server/supabase/service-client';

// Template Imports
import QuoteSentEmail from '../../../emails/templates/quote-sent';
import InvoiceCreatedEmail from '../../../emails/templates/invoice-created';
import PaymentConfirmationEmail from '../../../emails/templates/payment-confirmation';
import JobStatusUpdateEmail from '../../../emails/templates/job-status-update';
import WelcomeEmail from '../../../emails/templates/welcome';
import QuoteAcceptedEmail from '../../../emails/templates/quote-accepted';
import QuoteDeclinedEmail from '../../../emails/templates/quote-declined';

import type {
  QuoteSentEmailProps,
  InvoiceCreatedEmailProps,
  PaymentConfirmationEmailProps,
  JobStatusUpdateEmailProps,
  WelcomeEmailProps,
  QuoteAcceptedEmailProps,
  QuoteDeclinedEmailProps,
} from '../../../emails/types';

// Types
type EmailTemplateType = 
  | 'quote_sent'
  | 'invoice_created'
  | 'payment_confirmation'
  | 'job_status'
  | 'welcome'
  | 'quote_accepted'
  | 'quote_declined';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Cache settings
interface CachedSettings {
  data: Awaited<ReturnType<typeof getSettings>>;
  timestamp: number;
}

let settingsCache: CachedSettings | null = null;
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // 1 minute

class EmailService {
  /**
   * Get settings with caching
   */
  private async getCachedSettings() {
    const now = Date.now();
    if (settingsCache && (now - settingsCache.timestamp < SETTINGS_CACHE_TTL_MS)) {
      return settingsCache.data;
    }

    try {
      const settings = await getSettings();
      if (settings) {
        settingsCache = {
          data: settings,
          timestamp: now,
        };
      }
      return settings;
    } catch (error) {
      logger.error({
        scope: 'email.settings',
        message: 'Failed to load settings',
        error,
      });
      return null;
    }
  }

  /**
   * Replace variables in template strings
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  /**
   * Core send method
   */
  private async send(
    to: string,
    subject: string,
    html: string,
    templateType: EmailTemplateType,
    metadata: Record<string, unknown> = {}
  ): Promise<SendEmailResult> {
    const scope = 'email.send';
    const config = getEmailConfig();
    const startTime = Date.now();

    try {
      // 1. Check if emails are enabled (Config hardcode overrides everything)
      if (!config.enableEmailSend) {
        logger.info({
          scope,
          message: 'Email sending disabled by configuration',
          data: { to, templateType, success: false },
        });
        return { success: false, error: 'Email sending disabled' };
      }

      // 2. Get Settings (for DB-level toggle)
      const settings = await this.getCachedSettings();
      if (!settings) {
        return { success: false, error: 'Failed to load system settings' };
      }

      // Double check DB setting (although config usually merges this, 
      // but config.ts reads process.env primarily if ENABLE_EMAILS is true.
      // If ENABLE_EMAILS is false, config.enableEmailSend is false.
      // If ENABLE_EMAILS is true, config.enableEmailSend is (process.env || settings... wait, config.ts is mixed)
      // Let's trust config.enableEmailSend from getEmailConfig() as the source of truth
      // But wait, getEmailConfig in my implementation uses process.env.ENABLE_EMAIL_SEND, not the DB setting directly in the return logic.
      // Actually getEmailConfig uses "ENABLE_EMAILS && (process.env.ENABLE_EMAIL_SEND === 'true')". 
      // It DOES NOT read from DB.
      // So I should also check settings.enableEmailSend here for runtime dynamic toggle from DB.
      
      if (!settings.enableEmailSend) {
        logger.info({
          scope,
          message: 'Email sending disabled in system settings',
          data: { to, templateType, success: false },
        });
        return { success: false, error: 'Email sending disabled in settings' };
      }

      // 3. Initialize Client
      const resend = getResendClient();
      if (!resend) {
        logger.error({
          scope,
          message: 'Resend client not initialized',
          data: { to, templateType },
        });
        return { success: false, error: 'Email service not configured' };
      }

      // 4. Determine Recipient (Safety intercept)
      const recipient = config.isDev ? config.devEmail : to;
      
      // 5. Determine From Address
      const from = settings.emailFromAddress || config.fromAddress;

      // 6. Send via Resend
      const { data, error } = await resend.emails.send({
        from,
        to: recipient,
        subject,
        html,
      });

      if (error) {
        logger.error({
          scope,
          message: 'Resend API error',
          error,
          data: { to: recipient, templateType },
        });
        return { success: false, error: error.message };
      }

      const duration = Date.now() - startTime;
      logger.info({
        scope,
        message: 'Email sent successfully',
        data: { 
          to: recipient, 
          messageId: data?.id, 
          templateType, 
          duration 
        },
      });

      // 7. Log to Activity Logs (Best effort)
      // We don't await this to avoid blocking the response? 
      // Actually better to await to ensure audit trail, but failure shouldn't throw.
      // Using detached execution might be better but let's keep it simple and safe.
      this.logActivity(to, templateType, true, undefined, metadata).catch(err => {
        logger.error({ scope: 'email.activity', message: 'Failed to log activity', error: err });
      });

      return { success: true, messageId: data?.id };

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error({
        scope,
        message: 'Unexpected error sending email',
        error,
        data: { to, templateType },
      });
      
      // Log failure to activity logs
      this.logActivity(to, templateType, false, error, metadata).catch(() => {});

      return { success: false, error };
    }
  }

  /**
   * Helper to log email activity to DB
   */
  private async logActivity(
    to: string, 
    template: string, 
    success: boolean, 
    error?: string,
    metadata?: Record<string, unknown>
  ) {
    try {
      const supabase = getServiceSupabase();
      // We don't have a specific table for email logs, so we might use activity_logs
      // But activity_logs usually requires client_id/user_id. 
      // If we don't have those in metadata, we might skip or log to a general system log if available.
      // Looking at the schema, activity_logs has: client_id, user_id, invoice_id, quote_id, job_id.
      // If we have those in metadata, we use them.
      
      if (!metadata || (!metadata.clientId && !metadata.userId)) {
        // Can't link to specific entity easily without ID.
        // Maybe just logger is enough for system level.
        return;
      }

      await supabase.from('activity_logs').insert({
        client_id: metadata.clientId as number | null,
        // user_id: metadata.userId as number | null, // Check if schema supports user_id directly or if it's inferred
        // Checking schema from previous reads... activity_logs has client_id, quote_id, invoice_id, job_id. 
        // It does NOT seem to have user_id based on previous usages (e.g. auth.ts calls insert with client_id).
        // Wait, auth.ts:
        // client_id: quote.client_id,
        // quote_id: quote.id,
        
        quote_id: metadata.quoteId as number | null,
        invoice_id: metadata.invoiceId as number | null,
        job_id: metadata.jobId as number | null,
        
        action: 'EMAIL_SENT',
        message: `Email sent: ${template} to ${to}. Status: ${success ? 'Success' : 'Failed'}`,
        metadata: {
          recipient: to,
          template,
          success,
          error,
          ...metadata
        }
      });

    } catch (e) {
      // Ignore activity log errors to prevent disrupting flow
    }
  }

  // ==========================================
  // Typed Email Methods
  // ==========================================

  async sendWelcome(to: string, props: WelcomeEmailProps) {
    const settings = await this.getCachedSettings();
    // Fallback subject/body if settings not loaded or empty
    const defaultSubject = 'Welcome to {{businessName}}';
    const defaultBody = 'Thanks for signing up!';
    
    const subjectTemplate = settings?.emailTemplates?.welcome?.subject || defaultSubject;
    const bodyTemplate = settings?.emailTemplates?.welcome?.body || defaultBody;

    const subject = this.replaceVariables(subjectTemplate, {
      businessName: props.businessName,
    });

    const html = await render(WelcomeEmail({
      ...props,
      customMessage: bodyTemplate,
    }));

    // We don't have IDs here usually for welcome unless we pass them
    // But auth.signupClient passes clientId. We should ask for it if we want to log.
    // For now, keep signature compatible with props, but maybe allow optional metadata
    return this.send(to, subject, html, 'welcome', { businessName: props.businessName });
  }

  async sendQuoteSent(to: string, props: QuoteSentEmailProps & { clientId?: number, quoteId?: number }) {
    const settings = await this.getCachedSettings();
    const defaultSubject = 'Quote {{quoteNumber}} from {{businessName}}';
    const defaultBody = 'Your quote is ready for review.';
    
    const subjectTemplate = settings?.emailTemplates?.quote_sent?.subject || defaultSubject;
    const bodyTemplate = settings?.emailTemplates?.quote_sent?.body || defaultBody;

    const subject = this.replaceVariables(subjectTemplate, {
      quoteNumber: props.quoteNumber,
      businessName: props.businessName,
    });

    const html = await render(QuoteSentEmail({
      ...props,
      customMessage: bodyTemplate,
    }));

    return this.send(to, subject, html, 'quote_sent', { 
      clientId: props.clientId, 
      quoteId: props.quoteId,
      quoteNumber: props.quoteNumber 
    });
  }

  async sendQuoteAccepted(to: string, props: QuoteAcceptedEmailProps & { clientId?: number, quoteId?: number }) {
    const settings = await this.getCachedSettings();
    const defaultSubject = '[Admin] Quote {{quoteNumber}} Accepted';
    const defaultBody = 'Client accepted quote.';
    
    const subjectTemplate = settings?.emailTemplates?.quote_accepted?.subject || defaultSubject;
    const bodyTemplate = settings?.emailTemplates?.quote_accepted?.body || defaultBody;

    const subject = this.replaceVariables(subjectTemplate, {
      quoteNumber: props.quoteNumber,
    });

    const html = await render(QuoteAcceptedEmail({
      ...props,
      customMessage: bodyTemplate,
    }));

    return this.send(to, subject, html, 'quote_accepted', {
      clientId: props.clientId,
      quoteId: props.quoteId,
      quoteNumber: props.quoteNumber
    });
  }

  async sendQuoteDeclined(to: string, props: QuoteDeclinedEmailProps & { clientId?: number, quoteId?: number }) {
    const settings = await this.getCachedSettings();
    const defaultSubject = '[Admin] Quote {{quoteNumber}} Declined';
    const defaultBody = 'Client declined quote.';
    
    const subjectTemplate = settings?.emailTemplates?.quote_declined?.subject || defaultSubject;
    const bodyTemplate = settings?.emailTemplates?.quote_declined?.body || defaultBody;

    const subject = this.replaceVariables(subjectTemplate, {
      quoteNumber: props.quoteNumber,
    });

    const html = await render(QuoteDeclinedEmail({
      ...props,
      customMessage: bodyTemplate,
    }));

    return this.send(to, subject, html, 'quote_declined', {
      clientId: props.clientId,
      quoteId: props.quoteId,
      quoteNumber: props.quoteNumber
    });
  }

  async sendInvoiceCreated(to: string, props: InvoiceCreatedEmailProps & { clientId?: number, invoiceId?: number }) {
    const settings = await this.getCachedSettings();
    const defaultSubject = 'Invoice {{invoiceNumber}} from {{businessName}}';
    const defaultBody = 'Your invoice is ready.';
    
    const subjectTemplate = settings?.emailTemplates?.invoice_created?.subject || defaultSubject;
    const bodyTemplate = settings?.emailTemplates?.invoice_created?.body || defaultBody;

    const subject = this.replaceVariables(subjectTemplate, {
      invoiceNumber: props.invoiceNumber,
      businessName: props.businessName,
    });

    const html = await render(InvoiceCreatedEmail({
      ...props,
      customMessage: bodyTemplate,
    }));

    return this.send(to, subject, html, 'invoice_created', {
      clientId: props.clientId,
      invoiceId: props.invoiceId,
      invoiceNumber: props.invoiceNumber
    });
  }

  async sendPaymentConfirmation(to: string, props: PaymentConfirmationEmailProps & { clientId?: number, invoiceId?: number }) {
    const settings = await this.getCachedSettings();
    const defaultSubject = 'Payment Received - {{invoiceNumber}}';
    const defaultBody = 'Thank you for your payment.';
    
    const subjectTemplate = settings?.emailTemplates?.payment_confirmation?.subject || defaultSubject;
    const bodyTemplate = settings?.emailTemplates?.payment_confirmation?.body || defaultBody;

    const subject = this.replaceVariables(subjectTemplate, {
      invoiceNumber: props.invoiceNumber,
    });

    const html = await render(PaymentConfirmationEmail({
      ...props,
      customMessage: bodyTemplate,
    }));

    return this.send(to, subject, html, 'payment_confirmation', {
      clientId: props.clientId,
      invoiceId: props.invoiceId,
      invoiceNumber: props.invoiceNumber
    });
  }

  async sendJobStatusUpdate(to: string, props: JobStatusUpdateEmailProps & { clientId?: number, jobId?: number }) {
    const settings = await this.getCachedSettings();
    const defaultSubject = 'Job Update: {{jobNumber}} - {{status}}';
    const defaultBody = 'Your job status has changed.';
    
    const subjectTemplate = settings?.emailTemplates?.job_status?.subject || defaultSubject;
    const bodyTemplate = settings?.emailTemplates?.job_status?.body || defaultBody;

    const subject = this.replaceVariables(subjectTemplate, {
      jobNumber: props.jobNumber,
      status: props.status,
    });

    const html = await render(JobStatusUpdateEmail({
      ...props,
      customMessage: bodyTemplate,
    }));

    return this.send(to, subject, html, 'job_status', {
      clientId: props.clientId,
      jobId: props.jobId,
      jobNumber: props.jobNumber,
      status: props.status
    });
  }
}

export const emailService = new EmailService();

