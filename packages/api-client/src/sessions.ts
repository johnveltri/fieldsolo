import type { JobId } from '@fieldsolo/shared-types';

import type { FieldSoloSupabaseClient } from './client';
import { tryBumpJobToInProgressIfNotStarted } from './jobs';

export type SessionId = string;

export type CreateManualSessionInput = {
  jobId: JobId;
  /** ISO 8601 timestamp (UTC or with tz offset). */
  startedAt: string;
  /** ISO 8601 timestamp (UTC or with tz offset); must be >= startedAt. */
  endedAt: string;
};

export type UpdateSessionTimesInput = {
  startedAt: string;
  endedAt: string;
};

function assertTimeRange(startedAt: string, endedAt: string): void {
  const a = new Date(startedAt).getTime();
  const b = new Date(endedAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error('Session start/end must be valid ISO timestamps.');
  }
  if (b < a) {
    throw new Error('Session end time must be on or after start time.');
  }
}

/**
 * Inserts a manually-logged, already-completed session.
 * Maps to `public.sessions` with `entry_mode='manual'`, `session_status='ended'`.
 */
export async function createManualSession(
  client: FieldSoloSupabaseClient,
  input: CreateManualSessionInput,
): Promise<SessionId> {
  assertTimeRange(input.startedAt, input.endedAt);

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('No authenticated user available to create a session.');
  }

  const { data, error } = await client
    .from('sessions')
    .insert({
      job_id: input.jobId,
      user_id: userId,
      entry_mode: 'manual',
      session_status: 'ended',
      started_at: input.startedAt,
      ended_at: input.endedAt,
    })
    .select('id')
    .single();

  if (error) throw error;
  const sessionId = (data as { id: string }).id;
  await tryBumpJobToInProgressIfNotStarted(client, input.jobId);
  return sessionId;
}

/** Updates start/end timestamps on an existing session (no status change). */
export async function updateSessionTimes(
  client: FieldSoloSupabaseClient,
  sessionId: SessionId,
  input: UpdateSessionTimesInput,
): Promise<void> {
  assertTimeRange(input.startedAt, input.endedAt);

  const { data, error } = await client
    .from('sessions')
    .update({
      started_at: input.startedAt,
      ended_at: input.endedAt,
    })
    .eq('id', sessionId)
    .in('session_status', ['ended', 'in_progress'])
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Update affected no active rows (session may be deleted or not owned by you).');
  }
}

/**
 * Soft-deletes a session via status transition. Matches the
 * `sessions_status_timestamps_check` constraint (`deleted_at` required, `ended_at` cleared)
 * and triggers the child-unassignment migration.
 */
export async function deleteSession(
  client: FieldSoloSupabaseClient,
  sessionId: SessionId,
): Promise<void> {
  const { data, error } = await client
    .from('sessions')
    .update({
      session_status: 'deleted',
      deleted_at: new Date().toISOString(),
      ended_at: null,
    })
    .eq('id', sessionId)
    .in('session_status', ['ended', 'in_progress'])
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      'Delete affected no active rows (session may already be deleted or not owned by you).',
    );
  }
}
