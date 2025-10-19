const missing = (name: string): never => {
  throw new Error(`Missing required environment variable: ${name}`);
};

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? missing('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? missing('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getSupabaseServiceRoleKey(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? missing('SUPABASE_SERVICE_ROLE_KEY');
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? missing('SUPABASE_SERVICE_ROLE_KEY');
}

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

export function getStripeSuccessUrl(): string {
  const baseUrl = getAppUrl();
  return process.env.STRIPE_SUCCESS_URL?.trim() || `${baseUrl}/payment/success`;
}

export function getStripeCancelUrl(): string {
  const baseUrl = getAppUrl();
  return process.env.STRIPE_CANCEL_URL?.trim() || `${baseUrl}/payment/cancel`;
}

export function getStripeCurrency(): string {
  return (process.env.STRIPE_CURRENCY?.trim() || 'AUD').toUpperCase();
}
