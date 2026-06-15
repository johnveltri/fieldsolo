import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { SupportedStorage } from '@supabase/auth-js';

import { createKeyMigratingStorage } from './storageMigration';
import {
  FIELD_SOLO_AUTH_STORAGE_KEY,
  LEGACY_FIELD_BOOK_AUTH_STORAGE_KEY,
} from './storageKeys';

/**
 * Session persistence for Supabase Auth.
 * - **Web (Expo):** `AsyncStorage` has no native module → use `localStorage`.
 * - **iOS / Android:** use AsyncStorage (pin version with `npx expo install @react-native-async-storage/async-storage`).
 */
const webStorage: SupportedStorage = {
  getItem: (key) => {
    try {
      return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key, value) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* ignore quota / privacy mode */
    }
    return Promise.resolve();
  },
  removeItem: (key) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  },
};

const platformStorage: SupportedStorage =
  Platform.OS === 'web' ? webStorage : AsyncStorage;

export const authStorage: SupportedStorage = createKeyMigratingStorage(platformStorage, [
  {
    oldKey: LEGACY_FIELD_BOOK_AUTH_STORAGE_KEY,
    newKey: FIELD_SOLO_AUTH_STORAGE_KEY,
  },
]);
