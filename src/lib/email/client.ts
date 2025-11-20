import { Resend } from 'resend';
import { getEmailConfig } from './config';
import { logger } from '@/lib/logger';

let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  if (resendInstance) return resendInstance;

  const config = getEmailConfig();

  if (!config.resendApiKey) {
    logger.warn({
      scope: 'email.client',
      message: 'Resend API key not found. Email sending will be disabled.',
    });
    return null;
  }

  try {
    resendInstance = new Resend(config.resendApiKey);
    return resendInstance;
  } catch (error) {
    logger.error({
      scope: 'email.client',
      message: 'Failed to initialize Resend client',
      error,
    });
    return null;
  }
}

