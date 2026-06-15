import type { FieldSoloSupabaseClient } from './client';

/**
 * Updates the password for the currently-authenticated user. Wraps
 * `supabase.auth.updateUser({ password })`. Throws on error so callers
 * can surface the message.
 */
export async function updateCurrentUserPassword(
  client: FieldSoloSupabaseClient,
  newPassword: string,
): Promise<void> {
  const trimmed = newPassword;
  if (!trimmed || trimmed.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { error } = await client.auth.updateUser({ password: trimmed });
  if (error) throw error;
}

/**
 * Deletes the currently-authenticated user's account by invoking the
 * `delete-account` Supabase Edge Function. The function uses the service-role
 * key to call `auth.admin.deleteUser`, which cascade-deletes all owned rows
 * (profiles, jobs, sessions, notes, materials, etc.) via existing FKs.
 *
 * Callers should `signOut()` after a successful delete; the local session
 * is invalidated server-side but the JS client still holds the now-stale
 * tokens.
 */
export async function deleteCurrentAccount(
  client: FieldSoloSupabaseClient,
): Promise<void> {
  const { data, error } = await client.functions.invoke<{
    ok?: boolean;
    error?: string;
    detail?: string | null;
  }>('delete-account', {
    method: 'POST',
  });

  if (error) {
    throw new Error(error.message || 'Failed to delete account.');
  }
  if (!data?.ok) {
    const detail = data?.detail ? `: ${data.detail}` : '';
    throw new Error(`Failed to delete account${detail}`);
  }
}
