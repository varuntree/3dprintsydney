import { Resend } from 'resend';
import { getResendApiKey } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getSettings } from './settings';
import { render } from '@react-email/components';
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

interface SendEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

const DEFAULT_EMAIL_TEMPLATES = {
  quote_sent: {
    subject: 'Quote {{quoteNumber}} from {{businessName}}',
    body: 'Your quote is ready for review.',
  },
  invoice_created: {
    subject: 'Invoice {{invoiceNumber}} from {{businessName}}',
    body: 'Your invoice is ready.',
  },
  payment_confirmation: {
    subject: 'Payment Received - {{invoiceNumber}}',
    body: 'Thank you for your payment.',
  },
  job_status: {
    subject: 'Job Update: {{jobNumber}} - {{status}}',
    body: 'Your job status has changed.',
  },
  welcome: {
    subject: 'Welcome to {{businessName}}',
    body: 'Thanks for signing up!',
  },
  quote_accepted: {
    subject: '[Admin] Quote {{quoteNumber}} Accepted',
    body: 'Client accepted quote.',
  },
  quote_declined: {
    subject: '[Admin] Quote {{quoteNumber}} Declined',
    body: 'Client declined quote.',
  },
};

class EmailService {
  private resend: Resend | null = null;

  constructor() {
    const apiKey = getResendApiKey();
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    } });
    return result;
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    templateType: string,
  ): Promise<SendEmailResult> {
    const startTime = Date.now();

    try {
      // Check if email sending is enabled
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      if (!settings) {
        logger.error({ scope: 'email.send', error: 'Failed to load settings' });
        return { success: false, error: 'Failed to load settings' };
      }

      if (!settings.enableEmailSend) {
        logger.info({ scope: 'email.send', data: {
          to: 'disabled',
          template: templateType,
          success: false,
          reason: 'email_sending_disabled',
        } });
        return { success: false, error: 'Email sending is disabled' };
      }

      if (!this.resend) {
        logger.error({ scope: 'email.send', data: {
          to,
          template: templateType,
          success: false,
          error: 'Resend API key not configured',
        } });
        return { success: false, error: 'Email service not configured' };
      }

      // In development, redirect to test address
      const recipient =
        process.env.NODE_ENV === 'development' ? 'delivered@resend.dev' : to;

      const fromAddress = settings.emailFromAddress || 'noreply@3dprintsydney.com';

      // Retry logic with exponential backoff
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data, error } = await this.resend.emails.send({
            from: fromAddress,
            to: recipient,
            subject,
            html,
          } });

          if (error) {
            // Don't retry on 4xx errors (client errors)
            if (error.message?.includes('4')) {
              logger.error({ scope: 'email.send', data: {
                to: recipient,
                template: templateType,
                success: false,
                error: error.message,
                attempt,
              } });
              return { success: false, error: error.message };
            }

            throw new Error(error.message);
          }

          const duration = Date.now() - startTime;
          logger.info({ scope: 'email.send', data: {
            to: recipient,
            template: templateType,
            success: true,
            duration,
            messageId: data?.id,
          } });

          return { success: true, messageId: data?.id };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          // Wait before retry (exponential backoff)
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      // All retries failed
      const duration = Date.now() - startTime;
      logger.error({ scope: 'email.send', data: {
        to: recipient,
        template: templateType,
        success: false,
        error: lastError?.message,
        duration,
        attempts: 3,
      } });

      return { success: false, error: lastError?.message || 'Failed to send email' };
    } catch (err) {
      const duration = Date.now() - startTime;
      const error = err instanceof Error ? err.message : String(err);

      logger.error({ scope: 'email.send', data: {
        to,
        template: templateType,
        success: false,
        error,
        duration,
      } });

      return { success: false, error };
    }
  }

  async sendQuoteSent(to: string, data: QuoteSentEmailProps): Promise<SendEmailResult> {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      const template =
        settings.emailTemplates?.quote_sent || DEFAULT_EMAIL_TEMPLATES.quote_sent;

      const subject = this.replaceVariables(template.subject, {
        quoteNumber: data.quoteNumber,
        businessName: data.businessName,
      } });

      const emailProps = { ...data, customMessage: template.body };
      const html = await render(QuoteSentEmail(emailProps));

      return this.send(to, subject, html, 'quote_sent');
    } catch (error) {
      logger.error({ scope: 'email.send', data: {
        to,
        template: 'quote_sent',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } });
      return { success: false, error: 'Failed to render email template' };
    }
  }

  async sendInvoiceCreated(to: string, data: InvoiceCreatedEmailProps): Promise<SendEmailResult> {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      const template =
        settings.emailTemplates?.invoice_created || DEFAULT_EMAIL_TEMPLATES.invoice_created;

      const subject = this.replaceVariables(template.subject, {
        invoiceNumber: data.invoiceNumber,
        businessName: data.businessName,
      } });

      const emailProps = { ...data, customMessage: template.body };
      const html = await render(InvoiceCreatedEmail(emailProps));

      return this.send(to, subject, html, 'invoice_created');
    } catch (error) {
      logger.error({ scope: 'email.send', data: {
        to,
        template: 'invoice_created',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } });
      return { success: false, error: 'Failed to render email template' };
    }
  }

  async sendPaymentConfirmation(
    to: string,
    data: PaymentConfirmationEmailProps,
  ): Promise<SendEmailResult> {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      const template =
        settings.emailTemplates?.payment_confirmation ||
        DEFAULT_EMAIL_TEMPLATES.payment_confirmation;

      const subject = this.replaceVariables(template.subject, {
        invoiceNumber: data.invoiceNumber,
      } });

      const emailProps = { ...data, customMessage: template.body };
      const html = await render(PaymentConfirmationEmail(emailProps));

      return this.send(to, subject, html, 'payment_confirmation');
    } catch (error) {
      logger.error({ scope: 'email.send', data: {
        to,
        template: 'payment_confirmation',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } });
      return { success: false, error: 'Failed to render email template' };
    }
  }

  async sendJobStatusUpdate(
    to: string,
    data: JobStatusUpdateEmailProps,
  ): Promise<SendEmailResult> {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      const template =
        settings.emailTemplates?.job_status || DEFAULT_EMAIL_TEMPLATES.job_status;

      const subject = this.replaceVariables(template.subject, {
        jobNumber: data.jobNumber,
        status: data.status,
      } });

      const emailProps = { ...data, customMessage: template.body };
      const html = await render(JobStatusUpdateEmail(emailProps));

      return this.send(to, subject, html, 'job_status');
    } catch (error) {
      logger.error({ scope: 'email.send', data: {
        to,
        template: 'job_status',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } });
      return { success: false, error: 'Failed to render email template' };
    }
  }

  async sendWelcome(to: string, data: WelcomeEmailProps): Promise<SendEmailResult> {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      const template = settings.emailTemplates?.welcome || DEFAULT_EMAIL_TEMPLATES.welcome;

      const subject = this.replaceVariables(template.subject, {
        businessName: data.businessName,
      } });

      const emailProps = { ...data, customMessage: template.body };
      const html = await render(WelcomeEmail(emailProps));

      return this.send(to, subject, html, 'welcome');
    } catch (error) {
      logger.error({ scope: 'email.send', data: {
        to,
        template: 'welcome',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } });
      return { success: false, error: 'Failed to render email template' };
    }
  }

  async sendQuoteAccepted(to: string, data: QuoteAcceptedEmailProps): Promise<SendEmailResult> {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      const template =
        settings.emailTemplates?.quote_accepted || DEFAULT_EMAIL_TEMPLATES.quote_accepted;

      const subject = this.replaceVariables(template.subject, {
        quoteNumber: data.quoteNumber,
      } });

      const emailProps = { ...data, customMessage: template.body };
      const html = await render(QuoteAcceptedEmail(emailProps));

      return this.send(to, subject, html, 'quote_accepted');
    } catch (error) {
      logger.error({ scope: 'email.send', data: {
        to,
        template: 'quote_accepted',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } });
      return { success: false, error: 'Failed to render email template' };
    }
  }

  async sendQuoteDeclined(to: string, data: QuoteDeclinedEmailProps): Promise<SendEmailResult> {
    try {
      const settings = await getSettings();
      if (!settings) return { success: false, error: "Failed to load settings" };
      const template =
        settings.emailTemplates?.quote_declined || DEFAULT_EMAIL_TEMPLATES.quote_declined;

      const subject = this.replaceVariables(template.subject, {
        quoteNumber: data.quoteNumber,
      } });

      const emailProps = { ...data, customMessage: template.body };
      const html = await render(QuoteDeclinedEmail(emailProps));

      return this.send(to, subject, html, 'quote_declined');
    } catch (error) {
      logger.error({ scope: 'email.send', data: {
        to,
        template: 'quote_declined',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } });
      return { success: false, error: 'Failed to render email template' };
    }
  }
}

export const emailService = new EmailService();
