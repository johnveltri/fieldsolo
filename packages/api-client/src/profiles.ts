import type { FieldSoloSupabaseClient } from './client';

/** Camel-cased shape returned to the app. `trades` is always an array (possibly empty). */
export type UserProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  trades: string[];
};

export type UpdateUserProfileInput = {
  firstName?: string | null;
  lastName?: string | null;
  trades?: string[];
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  trades: string[] | null;
};

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    trades: Array.isArray(row.trades) ? row.trades : [],
  };
}

function normalizeName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Fetches the `public.profiles` row for the currently-authenticated user.
 *
 * Returns `null` only when there is no signed-in session. The on-insert
 * trigger guarantees a row exists for every auth user, so a signed-in
 * fetch should always return a value (an empty profile when the user
 * has not filled anything in yet).
 */
export async function fetchCurrentUserProfile(
  client: FieldSoloSupabaseClient,
): Promise<UserProfile | null> {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, first_name, last_name, trades')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToProfile(data as ProfileRow);
}

/**
 * Updates (or inserts) the profile row for the currently-authenticated user.
 *
 * Uses an UPSERT keyed on `id` so the call works even when the user predates
 * the on-insert trigger or the trigger somehow didn't fire — the RLS
 * `profiles_*_own` policies scope both the INSERT and UPDATE to
 * `auth.uid() = id`, so this is safe.
 */
export async function updateCurrentUserProfile(
  client: FieldSoloSupabaseClient,
  input: UpdateUserProfileInput,
): Promise<UserProfile> {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('No authenticated user available to update a profile.');
  }

  const cleanedTrades: string[] | undefined =
    input.trades !== undefined
      ? (() => {
          // Trim and drop empty strings; preserve order and de-dupe (case-insensitive).
          const seen = new Set<string>();
          const cleaned: string[] = [];
          for (const raw of input.trades ?? []) {
            const t = (raw ?? '').trim();
            if (!t) continue;
            const key = t.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            cleaned.push(t);
          }
          return cleaned;
        })()
      : undefined;

  const payload: Record<string, unknown> = { id: userId };
  if (input.firstName !== undefined) payload.first_name = normalizeName(input.firstName);
  if (input.lastName !== undefined) payload.last_name = normalizeName(input.lastName);
  if (cleanedTrades !== undefined) payload.trades = cleanedTrades;

  // If there is genuinely nothing to write, just return the current row
  // (or a synthetic empty one if even the row doesn't exist yet).
  if (Object.keys(payload).length === 1) {
    const current = await fetchCurrentUserProfile(client);
    if (current) return current;
    return { id: userId, firstName: null, lastName: null, trades: [] };
  }

  const { data, error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, first_name, last_name, trades')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Profile upsert affected no rows (check RLS).');
  }
  return rowToProfile(data as ProfileRow);
}
