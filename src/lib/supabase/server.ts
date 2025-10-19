import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericSupabaseClient = SupabaseClient<any>;

export async function getServerSupabase(): Promise<GenericSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op: route handlers manage cookie mutations explicitly.
      },
    },
  }) as unknown as GenericSupabaseClient;
}
