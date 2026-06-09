import type { AnalyticsProperties } from './types';

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const DEBUG_RICH_KEYS = new Set([
  'email',
  'debug_email',
  'customer_name',
  'job_short_description',
  'material_description',
  'error_message',
  'error_details',
  'error_hint',
]);

export function sanitizeProperties(
  properties: AnalyticsProperties,
  debugRichEnabled: boolean,
): AnalyticsProperties {
  const sanitized: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    if (!debugRichEnabled && DEBUG_RICH_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export function errorProperties(error: unknown): AnalyticsProperties {
  const errorObj = (error ?? {}) as ErrorLike;
  const message =
    typeof errorObj.message === 'string'
      ? errorObj.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';
  return {
    error_code: typeof errorObj.code === 'string' ? errorObj.code : null,
    error_message: message,
    error_details: typeof errorObj.details === 'string' ? errorObj.details : null,
    error_hint: typeof errorObj.hint === 'string' ? errorObj.hint : null,
    error_category: message.toLowerCase().includes('network') ? 'network' : 'application',
  };
}

export function emailProperties(email: string | null | undefined): AnalyticsProperties {
  const trimmed = (email ?? '').trim().toLowerCase();
  const domain = trimmed.includes('@') ? trimmed.split('@').pop() || null : null;
  return {
    email_domain: domain,
    debug_email: trimmed || null,
  };
}

export function textLengthBucket(text: string | null | undefined): string {
  const length = (text ?? '').trim().length;
  if (length === 0) return 'empty';
  if (length <= 25) return '1_25';
  if (length <= 100) return '26_100';
  if (length <= 500) return '101_500';
  return '501_plus';
}

export function moneyBucket(cents: number | null | undefined): string {
  if (cents == null) return 'unknown';
  if (cents === 0) return 'zero';
  const dollars = Math.abs(cents / 100);
  if (dollars < 25) return 'under_25';
  if (dollars < 100) return '25_99';
  if (dollars < 500) return '100_499';
  if (dollars < 1000) return '500_999';
  return '1000_plus';
}

export function quantityBucket(quantity: number | null | undefined): string {
  if (quantity == null) return 'unknown';
  if (quantity === 0) return 'zero';
  if (quantity <= 1) return 'one';
  if (quantity <= 5) return '2_5';
  if (quantity <= 20) return '6_20';
  return '21_plus';
}

export function durationMinutesBetween(startedAt: string, endedAt: string): number {
  const started = Date.parse(startedAt);
  const ended = Date.parse(endedAt);
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return 0;
  return Math.max(0, Math.round((ended - started) / 60000));
}

export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  return Object.keys(after).filter((key) => before[key] !== after[key]);
}
