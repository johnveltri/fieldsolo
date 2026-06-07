import type { JobDetailMaterialLine, JobDetailNote } from '@fieldbook/shared-types';

import type { FieldbookSupabaseClient } from './client';

/**
 * Inbox = quick-capture notes/materials with no parent job and no parent
 * session (`job_id IS NULL AND session_id IS NULL`). They are surfaced on the
 * Inbox screen and assigned to a job later via `updateNote` / `updateMaterial`.
 */

/** A note view item plus its raw `createdAt` so callers can time-bucket it. */
export type InboxNoteItem = JobDetailNote & { createdAt: string };

/** A material line view item plus its raw `createdAt` for time-bucketing. */
export type InboxMaterialItem = JobDetailMaterialLine & { createdAt: string };

export type InboxCounts = {
  notes: number;
  materials: number;
  total: number;
};

type NoteRow = {
  id: string;
  body: string;
  created_at: string;
};

type MaterialRow = {
  id: string;
  description: string | null;
  quantity: string | number | null;
  unit: string | null;
  unit_cost_cents: number | null;
  total_cost_cents: number;
  created_at: string;
};

const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatUsd(cents: number): string {
  return moneyFmt.format(cents / 100);
}

function formatDateLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function excerptNote(body: string, max = 120): string {
  const t = body.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function mapNote(row: NoteRow): InboxNoteItem {
  return {
    id: row.id,
    body: row.body,
    sessionId: null,
    excerpt: excerptNote(row.body),
    dateLabel: formatDateLabel(row.created_at),
    createdAt: row.created_at,
  };
}

function mapMaterial(row: MaterialRow): InboxMaterialItem {
  const quantityNum =
    typeof row.quantity === 'string' ? Number(row.quantity) : (row.quantity ?? 0);
  const unit = row.unit?.trim() ?? '';
  const unitCostCents = row.unit_cost_cents ?? 0;
  const baseQtyLabel =
    row.quantity != null && row.quantity !== ''
      ? `${row.quantity}${unit ? ` ${unit}` : ''}`
      : '—';
  const qtyLabel =
    baseQtyLabel !== '—' && unitCostCents > 0
      ? `${baseQtyLabel} @ ${formatUsd(unitCostCents)}`
      : baseQtyLabel;
  return {
    id: row.id,
    sessionId: null,
    name: row.description?.trim() || 'Material',
    quantity: Number.isFinite(quantityNum) ? quantityNum : 0,
    unit,
    unitCostCents,
    quantityLabel: qtyLabel,
    priceLabel: formatUsd(row.total_cost_cents),
    createdAt: row.created_at,
  };
}

/** Lists the current user's Inbox notes (no job, no session), newest first. */
export async function listInboxNotes(
  client: FieldbookSupabaseClient,
): Promise<InboxNoteItem[]> {
  const { data, error } = await client
    .from('notes')
    .select('id, body, created_at')
    .is('job_id', null)
    .is('session_id', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as NoteRow[] | null) ?? []).map(mapNote);
}

/** Lists the current user's Inbox materials (no job, no session), newest first. */
export async function listInboxMaterials(
  client: FieldbookSupabaseClient,
): Promise<InboxMaterialItem[]> {
  const { data, error } = await client
    .from('materials')
    .select('id, description, quantity, unit, unit_cost_cents, total_cost_cents, created_at')
    .is('job_id', null)
    .is('session_id', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as MaterialRow[] | null) ?? []).map(mapMaterial);
}

/**
 * Returns the count of Inbox notes + materials for the badge on the Jobs
 * header. Uses head-only count queries to avoid transferring rows.
 */
export async function countInboxItems(
  client: FieldbookSupabaseClient,
): Promise<InboxCounts> {
  const [notesRes, matsRes] = await Promise.all([
    client
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .is('job_id', null)
      .is('session_id', null)
      .is('deleted_at', null),
    client
      .from('materials')
      .select('id', { count: 'exact', head: true })
      .is('job_id', null)
      .is('session_id', null)
      .is('deleted_at', null),
  ]);
  if (notesRes.error) throw notesRes.error;
  if (matsRes.error) throw matsRes.error;
  const notes = notesRes.count ?? 0;
  const materials = matsRes.count ?? 0;
  return { notes, materials, total: notes + materials };
}
