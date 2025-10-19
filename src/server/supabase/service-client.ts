import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericSupabaseClient = SupabaseClient<any>;

let cached: GenericSupabaseClient | null = null;

export function getServiceSupabase(): GenericSupabaseClient {
  if (!cached) {
    cached = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-node',
        },
      },
    }) as unknown as GenericSupabaseClient;
  }
  return cached;
}
