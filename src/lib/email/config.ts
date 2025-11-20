import { z } from 'zod';

/**
 * Centralized email configuration
 * Handles environment variables and feature flags
 */

// Hardcoded flag to strictly disable emails during refactor/dev
export const ENABLE_EMAILS = false;

export const EmailConfigSchema = z.object({
  resendApiKey: z.string().optional(),
  fromAddress: z.string().default('noreply@3dprintsydney.com'),
  enableEmailSend: z.boolean().default(false),
  isDev: z.boolean().default(false),
  devEmail: z.string().email().default('delivered@resend.dev'),
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

export function getEmailConfig(): EmailConfig {
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@3dprintsydney.com',
    // Respect the global hardcoded flag first, then the env var
    enableEmailSend: ENABLE_EMAILS && (process.env.ENABLE_EMAIL_SEND === 'true'),
    isDev,
    devEmail: 'delivered@resend.dev',
  };
}

