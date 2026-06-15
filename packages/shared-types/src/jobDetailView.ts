/**
 * View model for Job Detail screen — aligns with DB + derived UI fields.
 * Maps from Supabase via `@fieldsolo/api-client` `fetchJobDetail`.
 */

/** Mirrors design-system `StatusPill` kinds for the job header pill (includes derived `paid`). */
export type JobDetailWorkStatus =
  | 'paid'
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'onHold'
  | 'cancelled';

/**
 * Merged note + material rows for a single session, sorted by `updatedAt` desc
 * in `fetchJobDetail` (used for the expanded session attachment list).
 */
export type JobDetailSessionAttachment =
  | {
      kind: 'note';
      id: string;
      /** ISO 8601 — from `notes.updated_at` (fallback: `created_at`). */
      updatedAt: string;
      /** List title — same excerpt rules as `JobDetailNote.excerpt`. */
      title: string;
    }
  | {
      kind: 'material';
      id: string;
      /** ISO 8601 — from `materials.updated_at` (fallback: `created_at`). */
      updatedAt: string;
      /** Primary line, e.g. `Copper wire (2 ea @ $2.00)`. */
      title: string;
      /** Right column — `total_cost` as USD. */
      priceLabel: string;
    };

export type JobDetailSession = {
  id: string;
  /** ISO 8601 timestamp (UTC with offset). Raw session start for prefilling edit UI. */
  startedAt: string;
  /** ISO 8601 timestamp or null while a session is still in progress. */
  endedAt: string | null;
  dateLabel: string;
  timeRangeLabel: string;
  durationLabel: string;
  /**
   * Notes and materials linked to this session, newest-updated first.
   * UI may show a preview of the first 3 and expand to the full list.
   */
  attachments: JobDetailSessionAttachment[];
};

export type JobDetailMaterialLine = {
  id: string;
  /** Set when the material is attached to a session; null for job-scoped materials. */
  sessionId: string | null;
  /** Description text — used as prefill when opening the Edit Material sheet. */
  name: string;
  /** Raw numeric quantity (matches `materials.quantity numeric(12,3)`). */
  quantity: number;
  /** Unit of measure (e.g. "ea", "ft"). Stored verbatim, may be custom. */
  unit: string;
  /** Per-unit cost in cents (raw value for the Edit sheet's unit price input). */
  unitCostCents: number;
  /**
   * Precomputed display label for the view-only material row, combining
   * quantity, unit, and per-unit cost (e.g. `"2 ea @ $37.50"`). When
   * `unitCostCents` is 0 or quantity is missing the `@ $…` suffix is
   * dropped and the label falls back to `"2 ea"` / `"—"`.
   */
  quantityLabel: string;
  /** Precomputed USD display label for `total_cost_cents`. */
  priceLabel: string;
};

export type JobDetailMaterialBucket = {
  id: string;
  kind: 'unassigned' | 'session';
  sessionDateLabel?: string;
  items: JobDetailMaterialLine[];
};

export type JobDetailNote = {
  id: string;
  /** Full body — used as prefill when opening the Edit Note sheet. */
  body: string;
  /** Set when the note is attached to a session; null for job-scoped notes. */
  sessionId: string | null;
  /** Truncated preview for list rendering. */
  excerpt: string;
  dateLabel: string;
};

export type JobDetailNoteBucket = {
  id: string;
  kind: 'unassigned' | 'session';
  sessionDateLabel?: string;
  notes: JobDetailNote[];
};

/** Full payload for `JobDetailScreen`. */
export type JobDetailViewModel = {
  id: string;
  shortDescription: string;
  customerName: string;
  serviceAddress: string;
  jobType: string;
  lastWorkedLabel: string;
  workStatus: JobDetailWorkStatus;
  earnings: {
    revenueCents: number;
    materialsCents: number;
    feesCents: number;
    netEarningsCents: number;
  };
  metrics: {
    timeLabel: string;
    netPerHrDisplay: string;
    sessionCount: number;
  };
  /** Sessions shown in current Job Detail UI (completed only). */
  displaySessions: JobDetailSession[];
  /** All non-deleted sessions (completed + in-progress) for future UI/flows. */
  allSessions: JobDetailSession[];
  /** Current in-progress session when present. */
  inProgressSession: JobDetailSession | null;
  materialBuckets: JobDetailMaterialBucket[];
  noteBuckets: JobDetailNoteBucket[];
  /**
   * User confirmed there were no materials for this job; satisfies the materials
   * leg of `is_financially_complete` until a material row is added.
   */
  noMaterialsConfirmed: boolean;
};

/** @deprecated Use JobDetailViewModel */
export type JobDetailMock = JobDetailViewModel;
