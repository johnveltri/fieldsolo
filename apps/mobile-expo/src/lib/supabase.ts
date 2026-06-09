import { createFieldbookClient } from '@fieldbook/api-client';

import { authStorage } from './authStorage';

type FieldbookClient = ReturnType<typeof createFieldbookClient>;

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const anon = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

const configured = url.length > 0 && anon.length > 0;

function createMissingSupabaseClient(): FieldbookClient {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
        );
      },
    },
  ) as FieldbookClient;
}

/** Shared Supabase client for the Expo app. Requires EXPO_PUBLIC_* env vars. */
export const supabase = configured
  ? createFieldbookClient(url, anon, {
      auth: {
        storage: authStorage,
        storageKey: 'fieldbook.auth.token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : createMissingSupabaseClient();

export function isSupabaseConfigured(): boolean {
  return configured;
}
