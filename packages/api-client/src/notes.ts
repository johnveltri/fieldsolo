import type { JobId } from '@fieldsolo/shared-types';

import type { FieldSoloSupabaseClient } from './client';
import type { SessionId } from './sessions';

export type NoteId = string;

/**
 * Input for creating a new note.
 *
 * - `sessionId` set → session-scoped note (`job_id` nulled out).
 * - `sessionId` null + `jobId` set → unassigned (job-scoped) note.
 * - `sessionId` null + `jobId` null → Inbox quick-capture note (no parent).
 */
export type CreateNoteInput = {
  jobId: JobId | null;
  sessionId: SessionId | null;
  body: string;
};

/**
 * Partial update for an existing note.
 *
 * - `body` — replaces the note text.
 * - `sessionId` — when provided (including `null`) reassigns the parent. Pass a
 *   session id to move the note into that session; pass `null` to move the note
 *   back to the unassigned (job-scoped) bucket.
 * - `jobId` — optional optimization for the `sessionId: null` path. When
 *   provided, reassignment can skip parent-resolution reads and still update
 *   both parent columns in one statement.
 */
export type UpdateNoteInput = {
  body?: string;
  sessionId?: SessionId | null;
  jobId?: JobId | null;
};

function assertBodyNotBlank(body: string): void {
  if (!body || !body.trim()) {
    throw new Error('Note body must not be blank.');
  }
}

/** Inserts a new note scoped to a session, a job, or the Inbox (no parent). */
export async function createNote(
  client: FieldSoloSupabaseClient,
  input: CreateNoteInput,
): Promise<NoteId> {
  assertBodyNotBlank(input.body);

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('No authenticated user available to create a note.');
  }

  const row = {
    user_id: userId,
    body: input.body.trim(),
    // When a session is chosen we null out job_id. Otherwise the note is
    // job-scoped, or — when jobId is also null — an Inbox quick capture with
    // no parent. Matches how fetchJobDetail / inbox lists bucket notes.
    job_id: input.sessionId ? null : (input.jobId ?? null),
    session_id: input.sessionId ?? null,
  };

  const { data, error } = await client
    .from('notes')
    .insert(row)
    .select('id')
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Updates a note's body and/or reassigns its parent session.
 *
 * When `sessionId` is provided we always write both `job_id` and `session_id`
 * in a single UPDATE so the `notes_exactly_one_parent` check never sees a
 * transient state with zero or two non-null parents.
 */
export async function updateNote(
  client: FieldSoloSupabaseClient,
  noteId: NoteId,
  input: UpdateNoteInput,
): Promise<void> {
  const patch: Record<string, unknown> = {};

  if (input.body !== undefined) {
    assertBodyNotBlank(input.body);
    patch.body = input.body.trim();
  }

  if (input.sessionId !== undefined) {
    if (input.sessionId === null) {
      if (input.jobId !== undefined && input.jobId !== null) {
        patch.job_id = input.jobId;
        patch.session_id = null;
      } else {
        // Reassign back to the job bucket. Fetch the parent job id from whichever
        // side is currently set, so the row ends up with exactly one parent.
        const { data: current, error: readErr } = await client
          .from('notes')
          .select('job_id, session_id')
          .eq('id', noteId)
          .is('deleted_at', null)
          .maybeSingle();
        if (readErr) throw readErr;
        if (!current) {
          throw new Error('Note not found (check RLS: note must be owned by you).');
        }
        const row = current as { job_id: string | null; session_id: string | null };
        let jobId = row.job_id;
        if (!jobId && row.session_id) {
          const { data: sess, error: sessErr } = await client
            .from('sessions')
            .select('job_id')
            .eq('id', row.session_id)
            .maybeSingle();
          if (sessErr) throw sessErr;
          jobId = (sess as { job_id: string } | null)?.job_id ?? null;
        }
        if (!jobId) {
          throw new Error('Could not resolve parent job for note reassignment.');
        }
        patch.job_id = jobId;
        patch.session_id = null;
      }
    } else {
      patch.job_id = null;
      patch.session_id = input.sessionId;
    }
  }

  if (Object.keys(patch).length === 0) return;

  const { data, error } = await client
    .from('notes')
    .update(patch)
    .eq('id', noteId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Update affected no rows (check RLS: note must be owned by you).');
  }
}

/** Deletes a note by soft-deleting it (stamping `deleted_at`). */
export async function deleteNote(
  client: FieldSoloSupabaseClient,
  noteId: NoteId,
): Promise<void> {
  const { data, error } = await client
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', noteId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Delete affected no rows (check RLS: note must be owned by you).');
  }
}
