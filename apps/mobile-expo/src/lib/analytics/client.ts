import AsyncStorage from '@react-native-async-storage/async-storage';

import { createNoopAdapter, createPostHogAdapter } from './adapters';
import {
  ANALYTICS_SCHEMA_VERSION,
  analyticsConfig,
  type AnalyticsConfig,
} from './config';
import { sanitizeProperties } from './utils';
import type {
  AnalyticsAdapter,
  AnalyticsEventName,
  AnalyticsEventPayloads,
  AnalyticsProperties,
  AnalyticsScreenName,
  AnalyticsUserTraits,
} from './types';

const ANONYMOUS_ID_KEY = 'fieldbook.analytics.anonymousId';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createAdapter(config: AnalyticsConfig): AnalyticsAdapter {
  if (config.provider === 'posthog' && config.posthogKey.length > 0) {
    return createPostHogAdapter({
      apiKey: config.posthogKey,
      host: config.posthogHost,
      onDrop: () => {},
    });
  }
  return createNoopAdapter(config.provider === 'posthog' ? 'posthog_unconfigured' : 'noop');
}

class AnalyticsClient {
  private adapter = createAdapter(analyticsConfig);
  private anonymousId = makeId('anon');
  private appSessionId = makeId('session');
  private currentScreen: AnalyticsScreenName | null = null;
  private userId: string | null = null;
  private ready = false;

  constructor(private readonly config: AnalyticsConfig) {
    void this.loadAnonymousId();
  }

  capture<Name extends AnalyticsEventName>(
    event: Name,
    properties: AnalyticsEventPayloads[Name] = {},
  ): void {
    const payload = this.withEnvelope(properties);
    try {
      this.adapter.capture(event, payload);
    } catch {
      // Analytics must never break product flows.
    }
  }

  identify(userId: string, traits: AnalyticsUserTraits = {}): void {
    this.userId = userId;
    try {
      this.adapter.identify(userId, this.clean(traits));
    } catch {
      // no-op
    }
  }

  reset(): void {
    this.userId = null;
    this.appSessionId = makeId('session');
    try {
      this.adapter.reset();
    } catch {
      // no-op
    }
  }

  screen(name: AnalyticsScreenName, properties: AnalyticsProperties = {}): void {
    this.currentScreen = name;
    const payload = this.withEnvelope({ screen: name, ...properties });
    try {
      this.adapter.screen(name, payload);
    } catch {
      // no-op
    }
    this.capture('screen_viewed', { screen: name, ...properties });
  }

  getCurrentScreen(): AnalyticsScreenName | null {
    return this.currentScreen;
  }

  private withEnvelope(properties: AnalyticsProperties): AnalyticsProperties {
    return this.clean({
      user_id: this.userId,
      anonymous_id: this.anonymousId,
      session_id: this.appSessionId,
      app_version: this.config.appVersion,
      build_number: this.config.buildNumber,
      platform: this.config.platform,
      environment: this.config.environment,
      is_testflight: this.config.isTestflight,
      analytics_schema_version: ANALYTICS_SCHEMA_VERSION,
      current_screen: this.currentScreen,
      debug_rich_enabled: this.config.debugRichEnabled,
      ...properties,
    });
  }

  private clean(properties: AnalyticsProperties): AnalyticsProperties {
    return sanitizeProperties(properties, this.config.debugRichEnabled);
  }

  private async loadAnonymousId(): Promise<void> {
    if (this.ready) return;
    this.ready = true;
    try {
      const stored = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
      if (stored) {
        this.anonymousId = stored;
        return;
      }
      await AsyncStorage.setItem(ANONYMOUS_ID_KEY, this.anonymousId);
    } catch {
      // In-memory anonymous id is fine if storage is unavailable.
    }
  }
}

export const analytics = new AnalyticsClient(analyticsConfig);
