/**
 * Shared recency time-bucketing for list section headers. Used by the Jobs
 * list and the Inbox so both render the same TODAY / PAST WEEK / PAST MONTH /
 * OLDER sections from the same logic.
 */

export type RecencyBucket = 'today' | 'pastWeek' | 'pastMonth' | 'older';

export function isSameLocalCalendarDay(anchorMs: number, nowMs: number): boolean {
  const a = new Date(anchorMs);
  const n = new Date(nowMs);
  return (
    a.getFullYear() === n.getFullYear() &&
    a.getMonth() === n.getMonth() &&
    a.getDate() === n.getDate()
  );
}

/**
 * Buckets an item by recency. `lastWorkedAt` (when set) wins over `createdAt`,
 * mirroring the DB list sort. Mutually exclusive: TODAY → PAST WEEK →
 * PAST MONTH → OLDER. Inbox items pass `lastWorkedAt = null` so they bucket
 * purely by their capture (`createdAt`) time.
 */
export function recencyBucket(
  lastWorkedAt: string | null,
  createdAt: string,
  nowMs: number,
): RecencyBucket {
  const anchor =
    lastWorkedAt != null && lastWorkedAt !== '' ? lastWorkedAt : createdAt;
  const t = new Date(anchor).getTime();
  if (Number.isNaN(t)) return 'older';
  const ms7 = 7 * 86_400_000;
  const ms30 = 30 * 86_400_000;
  if (isSameLocalCalendarDay(t, nowMs)) return 'today';
  if (t >= nowMs - ms7) return 'pastWeek';
  if (t >= nowMs - ms30) return 'pastMonth';
  return 'older';
}

export const RECENCY_BUCKET_TITLE: Record<RecencyBucket, string> = {
  today: 'TODAY',
  pastWeek: 'PAST WEEK',
  pastMonth: 'PAST MONTH',
  older: 'OLDER',
};

export const RECENCY_BUCKET_ORDER: RecencyBucket[] = [
  'today',
  'pastWeek',
  'pastMonth',
  'older',
];
