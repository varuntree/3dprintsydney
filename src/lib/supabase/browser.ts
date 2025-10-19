import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericSupabaseClient = SupabaseClient<any>;

let client: GenericSupabaseClient | null = null;

export function getBrowserSupabase(): GenericSupabaseClient {
  if (!client) {
    client = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey()) as unknown as GenericSupabaseClient;
  }
  return client;
}
