import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Supabase client for FieldSolo — add generated `Database` generic when types are generated. */
export type FieldSoloSupabaseClient = SupabaseClient;

export function createFieldSoloClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: Parameters<typeof createClient>[2],
): FieldSoloSupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, options);
}
