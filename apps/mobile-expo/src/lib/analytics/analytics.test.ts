import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

import { createNoopAdapter, createPostHogAdapter } from './adapters';
import { sanitizeProperties } from './utils';
import type { AnalyticsEventName } from './types';

const originalFetch = global.fetch;

describe('analytics adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
      } as Response),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('no-op adapter accepts the typed event surface without throwing', () => {
    const adapter = createNoopAdapter();
    const eventName: AnalyticsEventName = 'app_opened';

    expect(() => {
      adapter.capture(eventName, { platform: 'ios' });
      adapter.identify('user-1', { email_domain: 'example.com' });
      adapter.screen('home', { source: 'test' });
      adapter.reset();
    }).not.toThrow();
  });

  it('PostHog adapter posts capture, identify, and screen calls to the capture endpoint', () => {
    const adapter = createPostHogAdapter({
      apiKey: 'ph_test',
      host: 'https://us.i.posthog.com',
      onDrop: jest.fn(),
    });

    adapter.capture('job_created', { anonymous_id: 'anon-1', job_id: 'job-1' });
    adapter.identify('user-1', { email_domain: 'example.com' });
    adapter.screen('jobs', { source: 'test' });
    adapter.reset();

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://us.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: 'ph_test',
        event: 'job_created',
        properties: {
          distinct_id: 'anon-1',
          anonymous_id: 'anon-1',
          job_id: 'job-1',
        },
      }),
    });
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://us.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: 'ph_test',
        event: '$identify',
        properties: {
          distinct_id: 'user-1',
          user_id: 'user-1',
          $set: { email_domain: 'example.com' },
        },
      }),
    });
    expect(global.fetch).toHaveBeenNthCalledWith(3, 'https://us.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: 'ph_test',
        event: 'screen_viewed',
        properties: {
          distinct_id: 'user-1',
          screen: 'jobs',
          source: 'test',
        },
      }),
    });
  });
});

describe('analytics privacy sanitizer', () => {
  it('drops debug-rich fields when debug-rich mode is disabled', () => {
    expect(
      sanitizeProperties(
        {
          job_id: 'job-1',
          email: 'beta@example.com',
          job_short_description: 'Kitchen sink',
          error_message: 'Raw backend message',
        },
        false,
      ),
    ).toEqual({ job_id: 'job-1' });
  });

  it('keeps debug-rich fields when debug-rich mode is enabled', () => {
    expect(
      sanitizeProperties(
        {
          job_id: 'job-1',
          email: 'beta@example.com',
          job_short_description: 'Kitchen sink',
        },
        true,
      ),
    ).toEqual({
      job_id: 'job-1',
      email: 'beta@example.com',
      job_short_description: 'Kitchen sink',
    });
  });
});
