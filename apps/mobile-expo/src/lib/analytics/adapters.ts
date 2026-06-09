import type {
  AnalyticsAdapter,
  AnalyticsEventName,
  AnalyticsProperties,
  AnalyticsScreenName,
  AnalyticsUserTraits,
} from './types';

export function createNoopAdapter(name = 'noop'): AnalyticsAdapter {
  return {
    name,
    capture: () => {},
    identify: () => {},
    reset: () => {},
    screen: () => {},
  };
}

export function createPostHogAdapter(input: {
  apiKey: string;
  host: string;
  onDrop: (event: AnalyticsEventName, reason: string) => void;
}): AnalyticsAdapter {
  let identifiedUserId: string | null = null;

  const endpoint = `${input.host.replace(/\/+$/, '')}/capture/`;

  const distinctIdFor = (properties: AnalyticsProperties): string | null => {
    const userId = properties.user_id;
    if (typeof userId === 'string' && userId.trim().length > 0) return userId;
    if (identifiedUserId) return identifiedUserId;
    const anonymousId = properties.anonymous_id;
    return typeof anonymousId === 'string' && anonymousId.trim().length > 0
      ? anonymousId
      : null;
  };

  const post = (event: string, properties: AnalyticsProperties) => {
    const distinctId = distinctIdFor(properties);
    if (!distinctId) {
      input.onDrop('analytics_event_dropped', 'missing_distinct_id');
      return;
    }
    try {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          api_key: input.apiKey,
          event,
          properties: {
            distinct_id: distinctId,
            ...properties,
          },
        }),
      })
        .then((response) => {
          if (!response.ok) {
            input.onDrop('analytics_event_dropped', `posthog_http_${response.status}`);
            if (__DEV__) {
              console.warn(`[analytics] ${event} dropped: posthog ${response.status}`);
            }
          }
        })
        .catch((error: unknown) => {
          input.onDrop('analytics_event_dropped', 'posthog_network_error');
          if (__DEV__) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[analytics] ${event} dropped: ${message}`);
          }
      });
    } catch {
      input.onDrop('analytics_event_dropped', 'posthog_capture_failed');
    }
  };

  return {
    name: 'posthog',
    capture: (event: AnalyticsEventName, properties: AnalyticsProperties) => {
      post(event, properties);
    },
    identify: (userId: string, traits: AnalyticsUserTraits) => {
      identifiedUserId = userId;
      post('$identify', {
        user_id: userId,
        distinct_id: userId,
        $set: traits,
      });
    },
    reset: () => {
      identifiedUserId = null;
    },
    screen: (name: AnalyticsScreenName, properties: AnalyticsProperties) => {
      post('screen_viewed', { screen: name, ...properties });
    },
  };
}
